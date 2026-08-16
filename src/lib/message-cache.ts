import { auth } from "@clerk/nextjs/server";
import * as messageDb from "@/lib/db/messages";
import { withMailbox } from "@/lib/imap";
import { loadImapCreds } from "@/lib/mailboxes";

// The header-cache service: IMAP sync in, grouped reads out. SQL lives in
// lib/db/messages; ownership comes from loadImapCreds (sync) or auth() (reads).

// Requested verbatim and stored in raw_headers, so the classifier can be
// rewritten and re-run without another IMAP pass.
const FETCH_HEADERS = [
  "message-id",
  "in-reply-to",
  "from",
  "date",
  "subject",
  "list-id",
  "list-unsubscribe",
  "list-unsubscribe-post",
  "list-post",
  "precedence",
  "auto-submitted",
  "feedback-id",
  "dkim-signature",
];

const FOLDER = "INBOX";

function headerValue(block: string, name: string): string | null {
  // Unfold RFC 5322 continuation lines, then match the first occurrence.
  const unfolded = block.replace(/\r?\n[ \t]+/g, " ");
  return new RegExp(`^${name}:[ \\t]*(.+)$`, "im").exec(unfolded)?.[1]?.trim() ?? null;
}

function dkimDomain(block: string): string | null {
  const sig = headerValue(block, "dkim-signature");
  return sig ? (/(?:^|;)\s*d=([^;\s]+)/i.exec(sig)?.[1] ?? null) : null;
}

export type SyncResult = {
  email: string;
  fetched: number;
  total: number;
  /** True when UIDVALIDITY changed and the cache was rebuilt from scratch. */
  reset: boolean;
};

export async function syncMailbox(mailboxId: string): Promise<SyncResult> {
  const creds = await loadImapCreds(mailboxId);
  const id = Number(mailboxId);

  return withMailbox(creds, FOLDER, async (client, state) => {
    const stored = messageDb.syncState(id, FOLDER);

    // UIDs only mean anything within one UIDVALIDITY generation.
    const reset = stored.count > 0 && stored.uid_validity !== state.uidValidity;
    if (reset) messageDb.deleteForMailbox(id, FOLDER);

    const sinceUid = reset ? 0 : (stored.last_uid ?? 0);
    const rows: messageDb.HeaderRow[] = [];

    if (state.exists > 0) {
      for await (const msg of client.fetch(
        `${sinceUid + 1}:*`,
        { uid: true, envelope: true, size: true, headers: FETCH_HEADERS },
        { uid: true }
      )) {
        // `UID FETCH n:*` returns the last message even when n is past the end.
        if (msg.uid <= sinceUid) continue;

        const raw = msg.headers?.toString("utf8") ?? "";
        rows.push({
          uid: msg.uid,
          messageId: msg.envelope?.messageId ?? null,
          subject: msg.envelope?.subject ?? null,
          fromName: msg.envelope?.from?.[0]?.name ?? null,
          fromAddress: msg.envelope?.from?.[0]?.address ?? null,
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
          size: msg.size ?? null,
          listId: headerValue(raw, "list-id"),
          listUnsubscribe: headerValue(raw, "list-unsubscribe"),
          dkimDomain: dkimDomain(raw),
          rawHeaders: raw,
        });
      }
    }

    messageDb.insertBatch(id, FOLDER, state.uidValidity, rows);

    return {
      email: creds.email,
      fetched: rows.length,
      total: messageDb.countForMailbox(id, FOLDER),
      reset,
    };
  });
}

// ---- reads, all scoped to the signed-in user ----

export type CacheStats = { messages: number; bulk: number };
export type DomainGroup = ReturnType<typeof messageDb.domainGroupsForUser>[number];
export type AddressGroup = ReturnType<typeof messageDb.addressGroupsForUser>[number];
export type CachedMessage = ReturnType<typeof messageDb.bySenderForUser>[number];

async function userIdOrNull(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function cacheStats(): Promise<CacheStats> {
  const userId = await userIdOrNull();
  return userId ? messageDb.statsForUser(userId) : { messages: 0, bulk: 0 };
}

export async function domainGroups(): Promise<DomainGroup[]> {
  const userId = await userIdOrNull();
  return userId ? messageDb.domainGroupsForUser(userId) : [];
}

export async function addressGroups(domain: string): Promise<AddressGroup[]> {
  const userId = await userIdOrNull();
  return userId ? messageDb.addressGroupsForUser(userId, domain) : [];
}

export async function cachedMessages(address: string): Promise<CachedMessage[]> {
  const userId = await userIdOrNull();
  return userId ? messageDb.bySenderForUser(userId, address) : [];
}

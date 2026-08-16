import { auth } from "@clerk/nextjs/server";
import db from "@/lib/db";
import { withMailbox } from "@/lib/imap";
import { loadImapCreds } from "@/lib/mailboxes";

// The messages_metadata table. Ownership is enforced upstream: loadImapCreds
// resolves the mailbox id against the signed-in user before any IMAP call.

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
    const stored = db
      .prepare(
        `SELECT uid_validity, MAX(uid) AS last_uid, COUNT(*) AS n
         FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`
      )
      .get(id, FOLDER) as { uid_validity: number | null; last_uid: number | null; n: number };

    // UIDs only mean anything within one UIDVALIDITY generation.
    const reset = stored.n > 0 && stored.uid_validity !== state.uidValidity;
    if (reset) {
      db.prepare(`DELETE FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`).run(
        id,
        FOLDER
      );
    }

    const sinceUid = reset ? 0 : (stored.last_uid ?? 0);
    type NewRow = [number, string | null, string | null, string | null, string | null, string | null, number | null, string | null, string | null, string | null, string];
    const rows: NewRow[] = [];

    if (state.exists > 0) {
      for await (const msg of client.fetch(
        `${sinceUid + 1}:*`,
        { uid: true, envelope: true, size: true, headers: FETCH_HEADERS },
        { uid: true }
      )) {
        // `UID FETCH n:*` returns the last message even when n is past the end.
        if (msg.uid <= sinceUid) continue;

        const raw = msg.headers?.toString("utf8") ?? "";
        rows.push([
          msg.uid,
          msg.envelope?.messageId ?? null,
          msg.envelope?.subject ?? null,
          msg.envelope?.from?.[0]?.name ?? null,
          msg.envelope?.from?.[0]?.address ?? null,
          msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
          msg.size ?? null,
          headerValue(raw, "list-id"),
          headerValue(raw, "list-unsubscribe"),
          dkimDomain(raw),
          raw,
        ]);
      }
    }

    const insert = db.prepare(
      `INSERT INTO messages_metadata
         (mailbox_id, folder, uid, uid_validity, message_id, subject, from_name,
          from_address, "date", size, list_id, list_unsubscribe, dkim_domain, raw_headers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (mailbox_id, folder, uid_validity, uid) DO NOTHING`
    );
    db.transaction(() => {
      for (const r of rows) insert.run(id, FOLDER, r[0], state.uidValidity, ...r.slice(1));
    })();

    const total = (
      db
        .prepare(`SELECT COUNT(*) AS n FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`)
        .get(id, FOLDER) as { n: number }
    ).n;

    return { email: creds.email, fetched: rows.length, total, reset };
  });
}

export type CacheStats = { messages: number; bulk: number };

/** Synced totals for the signed-in user. Bulk = carries List-Unsubscribe. */
export async function cacheStats(): Promise<CacheStats> {
  const { userId } = await auth();
  if (!userId) return { messages: 0, bulk: 0 };

  const row = db
    .prepare(
      `SELECT COUNT(*) AS messages, COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ?`
    )
    .get(userId) as CacheStats;

  return row;
}

const DOMAIN_SQL = `lower(substr(m.from_address, instr(m.from_address, '@') + 1))`;

export type DomainGroup = {
  domain: string;
  senders: number;
  messages: number;
  bulk: number;
  latest: string | null;
};

export async function domainGroups(): Promise<DomainGroup[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .prepare(
      `SELECT ${DOMAIN_SQL} AS domain,
              COUNT(DISTINCT lower(m.from_address)) AS senders,
              COUNT(*) AS messages,
              COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk,
              MAX(m."date") AS latest
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND m.from_address LIKE '%@%'
       GROUP BY domain ORDER BY messages DESC`
    )
    .all(userId) as DomainGroup[];
}

export type AddressGroup = {
  address: string;
  name: string | null;
  messages: number;
  bulk: number;
  latest: string | null;
};

export async function addressGroups(domain: string): Promise<AddressGroup[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .prepare(
      `SELECT lower(m.from_address) AS address,
              MAX(m.from_name) AS name,
              COUNT(*) AS messages,
              COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk,
              MAX(m."date") AS latest
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND ${DOMAIN_SQL} = lower(?)
       GROUP BY address ORDER BY messages DESC`
    )
    .all(userId, domain) as AddressGroup[];
}

export type CachedMessage = {
  mailbox_id: number;
  mailbox_email: string;
  uid: number;
  subject: string | null;
  from_address: string | null;
  date: string | null;
};

export async function cachedMessages(address: string): Promise<CachedMessage[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .prepare(
      `SELECT m.mailbox_id, b.email AS mailbox_email, m.uid, m.subject,
              m.from_address, m."date"
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND lower(m.from_address) = lower(?)
       ORDER BY m."date" DESC`
    )
    .all(userId, address) as CachedMessage[];
}

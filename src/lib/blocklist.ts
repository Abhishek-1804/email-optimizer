import { auth } from "@clerk/nextjs/server";
import * as blockDb from "@/lib/db/blocklist";
import * as messageDb from "@/lib/db/messages";
import { withMailbox, SAFETY_FOLDER } from "@/lib/imap";
import { loadImapCreds, listMailboxes } from "@/lib/mailboxes";

// The blocklist service: rules in, moved mail out. SQL lives in lib/db/blocklist.

export type BlockRule = blockDb.BlockRule;
export type BlockKind = blockDb.BlockKind;

const FOLDER = "INBOX";

async function currentUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function listRules(): Promise<BlockRule[]> {
  const { userId } = await auth();
  return userId ? blockDb.listForUser(userId) : [];
}

export async function blockSender(kind: BlockKind, value: string): Promise<void> {
  blockDb.add(await currentUser(), kind, value);
}

const CANARY_SENDER = "nobody@canary.invalid";

/**
 * Splits pasted text into patterns, one per line, and checks each compiles.
 * Throws on the first bad line so nothing is half-added.
 *
 * A pattern that matches every sender (`.*`, `@`, `\.`) is never what anyone
 * meant — refuse it rather than let one Apply sweep the whole inbox. "Every
 * sender" is approximated by two that no real rule targets: the empty string
 * and an address on the reserved `.invalid` TLD.
 */
export function parsePatterns(text: string): string[] {
  const lines = [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];

  for (const line of lines) {
    let re: RegExp;
    try {
      re = new RegExp(line, "i");
    } catch {
      throw new Error(`“${line}” is not a valid regular expression.`);
    }
    if (re.test("") || re.test(CANARY_SENDER)) {
      throw new Error(`“${line}” matches every sender. Make it more specific.`);
    }
  }

  return lines;
}

/** Adds each line of `text` as a pattern rule. Returns how many lines there were. */
export async function blockPatterns(text: string): Promise<number> {
  const userId = await currentUser();
  const patterns = parsePatterns(text);
  for (const p of patterns) blockDb.add(userId, "pattern", p);
  return patterns.length;
}

export async function unblockSender(id: string): Promise<void> {
  blockDb.remove(await currentUser(), Number(id));
}

/** Which senders are blocked, for badging rows in the drill-down. */
export async function activeRules(): Promise<{
  domains: Set<string>;
  blocksAddress: (address: string) => boolean;
}> {
  const { userId } = await auth();
  if (!userId) return { domains: new Set(), blocksAddress: () => false };

  const { addresses, domains, patterns } = blockDb.rulesForUser(userId);
  // Same forgiveness as regexp() in db/client: a bad pattern matches nothing.
  const compiled = patterns.flatMap((p) => {
    try {
      return [new RegExp(p, "i")];
    } catch {
      return [];
    }
  });

  return {
    domains,
    blocksAddress: (a) => addresses.has(a) || compiled.some((re) => re.test(a)),
  };
}

export type PendingMessage = ReturnType<typeof blockDb.pendingForUser>[number];

/** How many messages Apply would move right now, each counted once. */
export async function pendingCount(): Promise<number> {
  const { userId } = await auth();
  return userId ? blockDb.pendingCountForUser(userId) : 0;
}

/** The mail Apply would move, for review first. Pass a rule id to narrow it. */
export async function pendingMessages(ruleId?: number): Promise<PendingMessage[]> {
  const { userId } = await auth();
  return userId ? blockDb.pendingForUser(userId, ruleId) : [];
}

export async function getRule(id: number) {
  const { userId } = await auth();
  return userId ? blockDb.ruleForUser(userId, id) : undefined;
}

export type ApplyResult = { moved: number; mailboxes: number };

/** Moved in chunks so a failure part-way leaves an accurate record. */
const MOVE_BATCH = 100;

/**
 * Moves every cached message matching a rule into the safety folder and stamps
 * moved_at on those rows. Nothing is deleted, here or on the server.
 *
 * The only write this app performs: `readOnly: false` below is the one place a
 * mailbox is opened writable. Grep for it to find every write.
 */
export async function applyBlocklist(): Promise<ApplyResult> {
  const userId = await currentUser();
  const boxes = (await listMailboxes()).filter((m) => m.hasMailScope);

  let moved = 0;
  let touched = 0;

  for (const box of boxes) {
    const matches = blockDb.matchingMessages(userId, Number(box.id), FOLDER);
    if (matches.length === 0) continue;

    const creds = await loadImapCreds(box.id);
    const uids = matches.map((m) => m.uid);

    await withMailbox(
      creds,
      FOLDER,
      async (client) => {
        for (let i = 0; i < uids.length; i += MOVE_BATCH) {
          const batch = uids.slice(i, i + MOVE_BATCH);
          await client.messageMove(batch, SAFETY_FOLDER, { uid: true });
          // Stamp per batch: a crash mid-Apply leaves the DB matching reality.
          messageDb.markMoved(Number(box.id), FOLDER, batch);
          moved += batch.length;
        }
      },
      { readOnly: false }
    );

    touched += 1;
  }

  return { moved, mailboxes: touched };
}

import { auth } from "@clerk/nextjs/server";
import * as blockDb from "@/lib/db/blocklist";
import * as messageDb from "@/lib/db/messages";
import { withMailbox, SAFETY_FOLDER } from "@/lib/imap";
import { loadImapCreds, listMailboxes } from "@/lib/mailboxes";

// The blocklist service: rules in, moved mail out. SQL lives in lib/db/blocklist.

export type BlockRule = blockDb.BlockRule;
export type BlockKind = "domain" | "address";

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

export async function unblockSender(id: string): Promise<void> {
  blockDb.remove(await currentUser(), Number(id));
}

/** Which senders are blocked, for badging rows in the drill-down. */
export async function activeRules() {
  const { userId } = await auth();
  return userId
    ? blockDb.rulesForUser(userId)
    : { addresses: new Set<string>(), domains: new Set<string>() };
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

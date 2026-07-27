/**
 * Keeps the local cache in step with the server.
 *
 * `imap.ts` and `imap-sync.ts` speak IMAP and know nothing about SQLite; this
 * module owns the cursor, the UIDVALIDITY reset rule and every write.
 */

import db from "./db";
import { withMailbox, type ImapAccount, type MailboxState } from "./imap";
import { headerBatches, downloadTextPart, type SyncedHeader } from "./imap-sync";

export type HeaderSyncSummary = {
  fetched: number;
  /** True if UIDVALIDITY changed and the cached copy had to be discarded. */
  reset: boolean;
  mailboxSize: number;
};

export type CacheStats = {
  messages: number;
  withBody: number;
  mailboxSize: number;
  lastSyncedAt: string | null;
};

const upsertMessage = db.prepare(`
  INSERT INTO messages (
    account_id, mailbox, uid, uid_validity,
    message_id, subject, from_name, from_address, to_addresses, "date", size,
    list_id, list_unsubscribe, dkim_domain, esp, in_reply_to,
    raw_headers, text_part
  ) VALUES (
    @account_id, @mailbox, @uid, @uid_validity,
    @message_id, @subject, @from_name, @from_address, @to_addresses, @date, @size,
    @list_id, @list_unsubscribe, @dkim_domain, @esp, @in_reply_to,
    @raw_headers, @text_part
  )
  ON CONFLICT (account_id, mailbox, uid_validity, uid) DO UPDATE SET
    message_id = excluded.message_id,
    subject = excluded.subject,
    from_name = excluded.from_name,
    from_address = excluded.from_address,
    to_addresses = excluded.to_addresses,
    "date" = excluded."date",
    size = excluded.size,
    list_id = excluded.list_id,
    list_unsubscribe = excluded.list_unsubscribe,
    dkim_domain = excluded.dkim_domain,
    esp = excluded.esp,
    in_reply_to = excluded.in_reply_to,
    raw_headers = excluded.raw_headers,
    text_part = excluded.text_part
`);

/**
 * Writes one batch in a transaction.
 *
 * The conflict clause updates header fields only — body_text and the classifier
 * columns come from later passes, and re-syncing must not discard that work.
 */
const storeBatch = db.transaction(
  (accountId: number, mailbox: string, uidValidity: number, batch: SyncedHeader[]) => {
    for (const msg of batch) {
      upsertMessage.run({
        account_id: accountId,
        mailbox,
        uid: msg.uid,
        uid_validity: uidValidity,
        message_id: msg.messageId,
        subject: msg.subject,
        from_name: msg.fromName,
        from_address: msg.fromAddress,
        to_addresses: JSON.stringify(msg.toAddresses),
        date: msg.date,
        size: msg.size,
        list_id: msg.listId,
        list_unsubscribe: msg.listUnsubscribe,
        dkim_domain: msg.dkimDomain,
        esp: msg.esp,
        in_reply_to: msg.inReplyTo,
        raw_headers: msg.rawHeaders,
        text_part: msg.textPart,
      });
    }
  }
);

/**
 * Throws away our local copy of a mailbox so it can be rebuilt from scratch.
 *
 * Local SQLite only — no mail is touched. The server is never opened for writing
 * (see `withMailbox`), and the rows deleted here are cached metadata, not mail.
 * Cost of running it is a re-download, including any bodies already backfilled.
 */
const discardCachedMailbox = db.transaction((accountId: number, mailbox: string) => {
  db.prepare(`DELETE FROM messages WHERE account_id = ? AND mailbox = ?`).run(accountId, mailbox);
  db.prepare(`DELETE FROM mailbox_sync WHERE account_id = ? AND mailbox = ?`).run(accountId, mailbox);
});

/**
 * Decides where to resume, given what the freshly opened mailbox reports.
 *
 * A changed UIDVALIDITY invalidates every cached UID, so resuming across that
 * boundary would silently attach new messages to stale rows. Discard instead.
 */
function decideResume(
  accountId: number,
  mailbox: string,
  state: MailboxState,
  full: boolean
): { sinceUid: number; reset: boolean } {
  const cursor = db
    .prepare(
      `SELECT uid_validity, last_seen_uid FROM mailbox_sync
       WHERE account_id = ? AND mailbox = ?`
    )
    .get(accountId, mailbox) as { uid_validity: number; last_seen_uid: number } | undefined;

  if (!cursor) return { sinceUid: 0, reset: false };

  const stale = cursor.uid_validity !== state.uidValidity;
  if (stale || full) {
    discardCachedMailbox(accountId, mailbox);
    return { sinceUid: 0, reset: stale };
  }

  return { sinceUid: cursor.last_seen_uid, reset: false };
}

function saveCursor(
  accountId: number,
  mailbox: string,
  state: MailboxState,
  highestUid: number
): void {
  db.prepare(
    `INSERT INTO mailbox_sync (account_id, mailbox, uid_validity, last_seen_uid, message_count, last_synced_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (account_id, mailbox) DO UPDATE SET
       uid_validity = excluded.uid_validity,
       last_seen_uid = MAX(mailbox_sync.last_seen_uid, excluded.last_seen_uid),
       message_count = excluded.message_count,
       last_synced_at = excluded.last_synced_at`
  ).run(accountId, mailbox, state.uidValidity, highestUid, state.exists);
}

/**
 * Pass 1: brings the metadata cache up to date.
 *
 * Safe to call repeatedly — it resumes from the stored UID and does nothing when
 * no new mail has arrived. On a fresh account this walks the whole mailbox.
 */
export async function syncAccountHeaders(
  accountId: number,
  creds: ImapAccount,
  options: { mailbox?: string; full?: boolean } = {}
): Promise<HeaderSyncSummary> {
  const mailbox = options.mailbox ?? "INBOX";

  return withMailbox(creds, mailbox, async (client, state) => {
    const { sinceUid, reset } = decideResume(accountId, mailbox, state, options.full ?? false);

    let fetched = 0;
    let highestUid = sinceUid;

    if (state.exists > 0) {
      for await (const batch of headerBatches(client, sinceUid)) {
        storeBatch(accountId, mailbox, state.uidValidity, batch);
        fetched += batch.length;
        // FETCH returns ascending UIDs, so the last of each batch is the highest.
        highestUid = Math.max(highestUid, batch[batch.length - 1].uid);
      }
    }

    saveCursor(accountId, mailbox, state, highestUid);

    return { fetched, reset, mailboxSize: state.exists };
  });
}

const storeBody = db.prepare(
  `UPDATE messages SET body_text = ?, body_fetched_at = datetime('now')
   WHERE account_id = ? AND mailbox = ? AND uid = ?`
);

/**
 * Pass 2: fills in body text for messages that lack it, newest first.
 *
 * Bounded by `limit` so this runs in slices rather than one long connection.
 */
export async function backfillBodies(
  accountId: number,
  creds: ImapAccount,
  options: { mailbox?: string; limit?: number } = {}
): Promise<{ fetched: number; remaining: number }> {
  const mailbox = options.mailbox ?? "INBOX";

  const pending = db
    .prepare(
      `SELECT uid, text_part FROM messages
       WHERE account_id = ? AND mailbox = ? AND body_fetched_at IS NULL
       ORDER BY "date" DESC
       LIMIT ?`
    )
    .all(accountId, mailbox, options.limit ?? 200) as {
    uid: number;
    text_part: string | null;
  }[];

  const fetched = await withMailbox(creds, mailbox, async (client) => {
    let count = 0;

    for (const row of pending) {
      const text = await downloadTextPart(client, row.uid, row.text_part);
      if (text === null) continue;

      storeBody.run(text, accountId, mailbox, row.uid);
      count += 1;
    }

    return count;
  });

  const { remaining } = db
    .prepare(
      `SELECT COUNT(*) AS remaining FROM messages
       WHERE account_id = ? AND mailbox = ? AND body_fetched_at IS NULL`
    )
    .get(accountId, mailbox) as { remaining: number };

  return { fetched, remaining };
}

/** Sync progress for one account. Reads the local cache only. */
export function cacheStats(accountId: number, mailbox = "INBOX"): CacheStats {
  const counts = db
    .prepare(
      `SELECT COUNT(*) AS messages,
              COALESCE(SUM(CASE WHEN body_fetched_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS withBody
       FROM messages WHERE account_id = ? AND mailbox = ?`
    )
    .get(accountId, mailbox) as { messages: number; withBody: number };

  const cursor = db
    .prepare(
      `SELECT message_count, last_synced_at FROM mailbox_sync
       WHERE account_id = ? AND mailbox = ?`
    )
    .get(accountId, mailbox) as { message_count: number; last_synced_at: string | null } | undefined;

  return {
    messages: counts.messages,
    withBody: counts.withBody,
    mailboxSize: cursor?.message_count ?? 0,
    lastSyncedAt: cursor?.last_synced_at ?? null,
  };
}

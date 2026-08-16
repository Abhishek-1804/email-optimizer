import db from "./client";

// SQL for messages_metadata. Same contract as db/mailboxes: explicit ids in,
// rows out, nothing else.

export type HeaderRow = {
  uid: number;
  messageId: string | null;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  date: string | null;
  size: number | null;
  listId: string | null;
  listUnsubscribe: string | null;
  dkimDomain: string | null;
  rawHeaders: string;
};

/** Where a sync should resume from, and which UID generation the cache holds. */
export function syncState(mailboxId: number, folder: string) {
  return db
    .prepare(
      `SELECT uid_validity, MAX(uid) AS last_uid, COUNT(*) AS count
       FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`
    )
    .get(mailboxId, folder) as {
    uid_validity: number | null;
    last_uid: number | null;
    count: number;
  };
}

/** Wipes one mailbox's cache — used when UIDVALIDITY changes. */
export function deleteForMailbox(mailboxId: number, folder: string): void {
  db.prepare(`DELETE FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`).run(
    mailboxId,
    folder
  );
}

export function insertBatch(
  mailboxId: number,
  folder: string,
  uidValidity: number,
  rows: HeaderRow[]
): void {
  const insert = db.prepare(
    `INSERT INTO messages_metadata
       (mailbox_id, folder, uid, uid_validity, message_id, subject, from_name,
        from_address, "date", size, list_id, list_unsubscribe, dkim_domain, raw_headers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (mailbox_id, folder, uid_validity, uid) DO NOTHING`
  );

  db.transaction(() => {
    for (const r of rows) {
      insert.run(
        mailboxId, folder, r.uid, uidValidity, r.messageId, r.subject, r.fromName,
        r.fromAddress, r.date, r.size, r.listId, r.listUnsubscribe, r.dkimDomain,
        r.rawHeaders
      );
    }
  })();
}

export function countForMailbox(mailboxId: number, folder: string): number {
  return (
    db
      .prepare(`SELECT COUNT(*) AS n FROM messages_metadata WHERE mailbox_id = ? AND folder = ?`)
      .get(mailboxId, folder) as { n: number }
  ).n;
}

/** Totals across all of a user's mailboxes. Bulk = carries List-Unsubscribe. */
export function statsForUser(userId: string) {
  return db
    .prepare(
      `SELECT COUNT(*) AS messages, COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ?`
    )
    .get(userId) as { messages: number; bulk: number };
}

const DOMAIN = `lower(substr(m.from_address, instr(m.from_address, '@') + 1))`;

/** One row per sender domain, biggest first. */
export function domainGroupsForUser(userId: string) {
  return db
    .prepare(
      `SELECT ${DOMAIN} AS domain,
              COUNT(DISTINCT lower(m.from_address)) AS senders,
              COUNT(*) AS messages,
              COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk,
              MAX(m."date") AS latest
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND m.from_address LIKE '%@%'
       GROUP BY domain ORDER BY messages DESC`
    )
    .all(userId) as {
    domain: string;
    senders: number;
    messages: number;
    bulk: number;
    latest: string | null;
  }[];
}

/** One row per sender address within a domain, biggest first. */
export function addressGroupsForUser(userId: string, domain: string) {
  return db
    .prepare(
      `SELECT lower(m.from_address) AS address,
              MAX(m.from_name) AS name,
              COUNT(*) AS messages,
              COALESCE(SUM(m.list_unsubscribe IS NOT NULL), 0) AS bulk,
              MAX(m."date") AS latest
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND ${DOMAIN} = lower(?)
       GROUP BY address ORDER BY messages DESC`
    )
    .all(userId, domain) as {
    address: string;
    name: string | null;
    messages: number;
    bulk: number;
    latest: string | null;
  }[];
}

/** Every cached message from one sender, newest first. */
export function bySenderForUser(userId: string, address: string) {
  return db
    .prepare(
      `SELECT m.mailbox_id, b.email AS mailbox_email, m.uid, m.subject,
              m.from_address, m."date"
       FROM messages_metadata m JOIN mailboxes b ON b.id = m.mailbox_id
       WHERE b.clerk_user_id = ? AND lower(m.from_address) = lower(?)
       ORDER BY m."date" DESC`
    )
    .all(userId, address) as {
    mailbox_id: number;
    mailbox_email: string;
    uid: number;
    subject: string | null;
    from_address: string | null;
    date: string | null;
  }[];
}

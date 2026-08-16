import db from "./client";

// SQL for the mailboxes table. Nothing else: no auth, no crypto, no IMAP.
// Every function takes an explicit userId — scoping is the caller's job to
// provide and this layer's job to apply.

export type MailboxRow = {
  id: number;
  email: string;
  provider: string;
  scopes: string;
  refresh_token: string;
};

const COLS = `id, email, provider, scopes, refresh_token`;

export function listForUser(userId: string): MailboxRow[] {
  return db
    .prepare(`SELECT ${COLS} FROM mailboxes WHERE clerk_user_id = ? ORDER BY created_at`)
    .all(userId) as MailboxRow[];
}

export function getForUser(userId: string, id: number): MailboxRow | undefined {
  return db
    .prepare(`SELECT ${COLS} FROM mailboxes WHERE id = ? AND clerk_user_id = ?`)
    .get(id, userId) as MailboxRow | undefined;
}

/** Insert, or replace the grant if this user already connected this address. */
export function upsertGrant(
  userId: string,
  email: string,
  encryptedRefreshToken: string,
  scopes: string
): void {
  db.prepare(
    `INSERT INTO mailboxes (clerk_user_id, provider, email, refresh_token, scopes)
     VALUES (?, 'google', ?, ?, ?)
     ON CONFLICT (clerk_user_id, provider, email)
     DO UPDATE SET refresh_token = excluded.refresh_token, scopes = excluded.scopes`
  ).run(userId, email, encryptedRefreshToken, scopes);
}

/** Cascades to messages_metadata via the FK. */
export function deleteForUser(userId: string, id: number): void {
  db.prepare(`DELETE FROM mailboxes WHERE id = ? AND clerk_user_id = ?`).run(id, userId);
}

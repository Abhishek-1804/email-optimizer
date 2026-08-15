import { auth } from "@clerk/nextjs/server";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { GMAIL_SCOPE, accessTokenFor, revokeToken } from "@/lib/google";
import type { ConnectedMailbox } from "@/lib/google";
import type { ImapAccount } from "@/lib/imap";

/**
 * The mailboxes table, and the only way anything reaches it.
 *
 * Every exported function scopes itself to the signed-in Clerk user, so an id
 * that belongs to someone else resolves to nothing. Callers never pass a user
 * id, which means they can't get the scoping wrong.
 */

/** Per-provider IMAP endpoints. Only providers listed here can be read. */
const IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  google: { host: "imap.gmail.com", port: 993 },
};

/** A connected mailbox, safe to hand to the browser — no token in sight. */
export type Mailbox = {
  id: string;
  email: string;
  provider: string;
  hasMailScope: boolean;
};

type Row = {
  id: number;
  email: string;
  provider: string;
  scopes: string;
  refresh_token: string;
};

async function currentUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Every mailbox the signed-in user has connected. */
export async function listMailboxes(): Promise<Mailbox[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = db
    .prepare(
      `SELECT id, email, provider, scopes, refresh_token
       FROM mailboxes WHERE clerk_user_id = ? ORDER BY created_at`
    )
    .all(userId) as Row[];

  return rows.map((row) => ({
    id: String(row.id),
    email: row.email,
    provider: row.provider,
    hasMailScope: row.scopes.includes(GMAIL_SCOPE),
  }));
}

/**
 * Stores a freshly granted mailbox.
 *
 * Reconnecting the same address replaces the token rather than adding a row —
 * Google issues a new refresh token on every `prompt=consent`, and keeping the
 * old one around would just leave a second live credential lying about.
 */
export async function saveMailbox(mailbox: ConnectedMailbox): Promise<void> {
  const userId = await currentUser();

  db.prepare(
    `INSERT INTO mailboxes (clerk_user_id, provider, email, refresh_token, scopes)
     VALUES (?, 'google', ?, ?, ?)
     ON CONFLICT (clerk_user_id, provider, email)
     DO UPDATE SET refresh_token = excluded.refresh_token, scopes = excluded.scopes`
  ).run(userId, mailbox.email, encrypt(mailbox.refreshToken), mailbox.scopes);
}

/** Revokes the grant at Google, then forgets the mailbox. */
export async function removeMailbox(id: string): Promise<void> {
  const userId = await currentUser();

  const row = db
    .prepare(`SELECT refresh_token FROM mailboxes WHERE id = ? AND clerk_user_id = ?`)
    .get(Number(id), userId) as { refresh_token: string } | undefined;

  if (!row) return;

  await revokeToken(decrypt(row.refresh_token));
  db.prepare(`DELETE FROM mailboxes WHERE id = ? AND clerk_user_id = ?`).run(Number(id), userId);
}

/**
 * Turns a stored mailbox into live IMAP credentials.
 *
 * The access token is minted per call and never stored — only the refresh token
 * is, encrypted.
 */
export async function loadImapCreds(id: string): Promise<ImapAccount> {
  const userId = await currentUser();

  const row = db
    .prepare(
      `SELECT id, email, provider, scopes, refresh_token
       FROM mailboxes WHERE id = ? AND clerk_user_id = ?`
    )
    .get(Number(id), userId) as Row | undefined;

  if (!row) throw new Error("Mailbox not found");

  const endpoint = IMAP_HOSTS[row.provider];
  if (!endpoint) throw new Error(`${row.provider} mailboxes are not supported yet`);

  if (!row.scopes.includes(GMAIL_SCOPE)) {
    throw new Error(`${row.email} has not granted mail access. Reconnect it.`);
  }

  return {
    host: endpoint.host,
    port: endpoint.port,
    email: row.email,
    accessToken: await accessTokenFor(decrypt(row.refresh_token)),
  };
}

/** Turns an IMAP or token failure into something a person can act on. */
export function imapError(err: unknown): Error {
  const e = err as { authenticationFailed?: boolean; responseText?: string; code?: string };

  if (e?.authenticationFailed) {
    return new Error(
      "The mailbox rejected this token. Disconnect and reconnect the mailbox to grant " +
        "mail access again." + (e.responseText ? ` Server said: ${e.responseText}` : "")
    );
  }

  if (e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT") {
    return new Error(`Could not reach the mail server (${e.code}).`);
  }

  return err instanceof Error ? err : new Error("Could not open this mailbox.");
}

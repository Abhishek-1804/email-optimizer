"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { fetchRecentMessages, fetchMessageBody, type InboxMessage, type MessageDetail } from "@/lib/imap";
import {
  syncAccountHeaders,
  backfillBodies,
  cacheStats,
  type HeaderSyncSummary,
  type CacheStats,
} from "@/lib/sync";
export type { InboxMessage, MessageDetail } from "@/lib/imap";
export type { HeaderSyncSummary, CacheStats } from "@/lib/sync";

type ImapCreds = {
  email: string;
  imap_host: string;
  imap_port: number;
  appPassword: string;
};

/** Loads and decrypts one of the current user's accounts for server-side IMAP use. */
async function loadImapCreds(accountId: number): Promise<ImapCreds> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const row = db
    .prepare(
      `SELECT email, imap_host, imap_port, app_password
       FROM email_accounts WHERE id = ? AND clerk_user_id = ?`
    )
    .get(accountId, userId) as
    | { email: string; imap_host: string; imap_port: number; app_password: string }
    | undefined;

  if (!row) throw new Error("Account not found");

  return {
    email: row.email,
    imap_host: row.imap_host,
    imap_port: row.imap_port,
    appPassword: decrypt(row.app_password),
  };
}

export type EmailAccount = {
  id: number;
  email: string;
  imap_host: string;
  imap_port: number;
  label: string | null;
  created_at: string;
};

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .prepare(
      `SELECT id, email, imap_host, imap_port, label, created_at
       FROM email_accounts WHERE clerk_user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as EmailAccount[];
}

export async function addEmailAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const email = String(formData.get("email") ?? "").trim();
  // Google displays app passwords in four spaced groups ("abcd efgh ijkl mnop").
  // Pasting that verbatim fails to authenticate, so strip whitespace throughout
  // rather than only at the ends.
  const appPassword = String(formData.get("appPassword") ?? "").replace(/\s+/g, "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const imapHost = String(formData.get("imapHost") ?? "").trim() || "imap.gmail.com";
  const imapPort = Number(formData.get("imapPort")) || 993;

  if (!email || !appPassword) {
    throw new Error("Email and app password are required");
  }

  db.prepare(
    `INSERT INTO email_accounts (clerk_user_id, email, imap_host, imap_port, app_password, label)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, email, imapHost, imapPort, encrypt(appPassword), label);

  revalidatePath("/dashboard");
}

/**
 * Turns an IMAP failure into something actionable.
 *
 * ImapFlow flags credential rejections with `authenticationFailed` and carries
 * the server's own explanation — for Gmail that names the real cause, so it is
 * worth surfacing rather than collapsing everything into one generic message.
 */
function imapError(err: unknown): Error {
  const e = err as { authenticationFailed?: boolean; responseText?: string; code?: string };

  if (e?.authenticationFailed) {
    return new Error(
      "Mailbox rejected the credentials. Gmail needs 2-Step Verification switched on and " +
        "an app password — your normal Google password will not work." +
        (e.responseText ? ` Server said: ${e.responseText}` : "")
    );
  }

  if (e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT") {
    return new Error(`Could not reach the mail server (${e.code}). Check the host and port.`);
  }

  return new Error("Could not connect to this mailbox. Check the app password and host/port.");
}

export async function previewInbox(accountId: number): Promise<InboxMessage[]> {
  const creds = await loadImapCreds(accountId);

  try {
    return await fetchRecentMessages(creds);
  } catch (err) {
    console.error(`IMAP preview failed for account ${accountId}:`, err);
    throw imapError(err);
  }
}

export async function viewMessage(accountId: number, uid: number): Promise<MessageDetail> {
  const creds = await loadImapCreds(accountId);

  try {
    return await fetchMessageBody(creds, uid);
  } catch (err) {
    console.error(`IMAP message fetch failed for account ${accountId}, uid ${uid}:`, err);
    throw imapError(err);
  }
}

/**
 * Pulls metadata and grouping signals for the whole mailbox into SQLite.
 *
 * First run walks the entire mailbox; later runs resume from the stored UID and
 * cost nothing when there is no new mail. No bodies are fetched here.
 */
export async function syncAccount(
  accountId: number,
  options: { full?: boolean } = {}
): Promise<HeaderSyncSummary> {
  const creds = await loadImapCreds(accountId);

  try {
    return await syncAccountHeaders(accountId, creds, { full: options.full });
  } catch (err) {
    console.error(`IMAP header sync failed for account ${accountId}:`, err);
    throw imapError(err);
  } }

/** Fills in body text for a bounded slice of already-synced messages. */
export async function syncAccountBodies(
  accountId: number,
  limit = 200
): Promise<{ fetched: number; remaining: number }> {
  const creds = await loadImapCreds(accountId);

  try {
    return await backfillBodies(accountId, creds, { limit });
  } catch (err) {
    console.error(`IMAP body backfill failed for account ${accountId}:`, err);
    throw imapError(err);
  }
}

/** Sync progress for one account. Reads the local cache only — no IMAP connection. */
export async function getCacheStats(accountId: number): Promise<CacheStats> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const owned = db
    .prepare(`SELECT id FROM email_accounts WHERE id = ? AND clerk_user_id = ?`)
    .get(accountId, userId);
  if (!owned) throw new Error("Account not found");

  return cacheStats(accountId);
}

export async function removeEmailAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const id = Number(formData.get("id"));
  db.prepare(`DELETE FROM email_accounts WHERE id = ? AND clerk_user_id = ?`).run(id, userId);

  revalidatePath("/dashboard");
}

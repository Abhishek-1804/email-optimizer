"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { fetchRecentMessages, fetchMessageBody, type InboxMessage, type MessageDetail } from "@/lib/imap";
export type { InboxMessage, MessageDetail } from "@/lib/imap";

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
  const appPassword = String(formData.get("appPassword") ?? "").trim();
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

export async function previewInbox(accountId: number): Promise<InboxMessage[]> {
  const creds = await loadImapCreds(accountId);

  try {
    return await fetchRecentMessages(creds);
  } catch (err) {
    console.error(`IMAP preview failed for account ${accountId}:`, err);
    throw new Error("Could not connect to this mailbox. Check the app password and host/port.");
  }
}

export async function viewMessage(accountId: number, uid: number): Promise<MessageDetail> {
  const creds = await loadImapCreds(accountId);

  try {
    return await fetchMessageBody(creds, uid);
  } catch (err) {
    console.error(`IMAP message fetch failed for account ${accountId}, uid ${uid}:`, err);
    throw new Error("Could not load this message.");
  }
}

export async function removeEmailAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const id = Number(formData.get("id"));
  db.prepare(`DELETE FROM email_accounts WHERE id = ? AND clerk_user_id = ?`).run(id, userId);

  revalidatePath("/dashboard");
}

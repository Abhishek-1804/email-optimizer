"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

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

/** Decrypts and returns the app password for one of the current user's accounts. For server-side IMAP use only — never return this to the client. */
export async function getDecryptedAppPassword(accountId: number): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const row = db
    .prepare(`SELECT app_password FROM email_accounts WHERE id = ? AND clerk_user_id = ?`)
    .get(accountId, userId) as { app_password: string } | undefined;

  return row ? decrypt(row.app_password) : null;
}

export async function removeEmailAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const id = Number(formData.get("id"));
  db.prepare(`DELETE FROM email_accounts WHERE id = ? AND clerk_user_id = ?`).run(id, userId);

  revalidatePath("/dashboard");
}

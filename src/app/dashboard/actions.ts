"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { encrypt } from "@/lib/crypto";

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

export async function removeEmailAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const id = Number(formData.get("id"));
  db.prepare(`DELETE FROM email_accounts WHERE id = ? AND clerk_user_id = ?`).run(id, userId);

  revalidatePath("/dashboard");
}

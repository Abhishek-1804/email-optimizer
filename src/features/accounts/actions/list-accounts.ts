"use server";

import { auth } from "@clerk/nextjs/server";
import db from "@/lib/db";
import type { EmailAccount } from "../types";

export async function listAccounts(): Promise<EmailAccount[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .prepare(
      `SELECT id, email, imap_host, imap_port, label, created_at
       FROM email_accounts WHERE clerk_user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as EmailAccount[];
}

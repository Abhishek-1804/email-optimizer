import { auth } from "@clerk/nextjs/server";
import db from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { ImapAccount } from "@/lib/imap";

/**
 * Lives in lib/ rather than features/accounts because the messages feature
 * needs it too, and features must not import each other.
 */
export async function loadImapCreds(accountId: number): Promise<ImapAccount> {
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

/**
 * ImapFlow flags credential rejections with `authenticationFailed` and carries
 * the server's own explanation, which for Gmail names the real cause. Worth
 * surfacing rather than collapsing everything into one generic message.
 */
export function imapError(err: unknown): Error {
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

"use server";

import { withMailbox } from "@/lib/imap";
import { loadImapCreds, imapError } from "@/lib/imap-credentials";
import type { InboxMessage } from "../types";

/** The most recent `limit` messages in INBOX, newest first. */
export async function listMessages(accountId: number, limit = 25): Promise<InboxMessage[]> {
  const creds = await loadImapCreds(accountId);

  try {
    return await withMailbox(creds, "INBOX", async (client, state) => {
      if (state.exists === 0) return [];

      const start = Math.max(1, state.exists - limit + 1);
      const messages: InboxMessage[] = [];

      for await (const msg of client.fetch(`${start}:${state.exists}`, {
        envelope: true,
        uid: true,
      })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0]?.address ?? "(unknown sender)",
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        });
      }

      return messages.reverse();
    });
  } catch (err) {
    console.error(`IMAP list failed for account ${accountId}:`, err);
    throw imapError(err);
  }
}

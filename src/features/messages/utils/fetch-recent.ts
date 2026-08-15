import { withMailbox, type ImapAccount } from "@/lib/imap";
import type { InboxMessage } from "../types";

/** Newest `limit` messages in INBOX. Takes creds, so both views can share it. */
export async function fetchRecent(
  creds: ImapAccount,
  mailboxId: string,
  limit: number
): Promise<InboxMessage[]> {
  return withMailbox(creds, "INBOX", async (client, state) => {
    if (state.exists === 0) return [];

    const start = Math.max(1, state.exists - limit + 1);
    const messages: InboxMessage[] = [];

    for await (const msg of client.fetch(`${start}:${state.exists}`, {
      envelope: true,
      uid: true,
    })) {
      messages.push({
        mailboxId,
        mailboxEmail: creds.email,
        uid: msg.uid,
        subject: msg.envelope?.subject ?? "(no subject)",
        from: msg.envelope?.from?.[0]?.address ?? "(unknown sender)",
        date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
      });
    }

    return messages.reverse();
  });
}

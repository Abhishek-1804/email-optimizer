import { ImapFlow } from "imapflow";

export type InboxMessage = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
};

type ImapAccount = {
  imap_host: string;
  imap_port: number;
  email: string;
  appPassword: string;
};

/** Connects, fetches the most recent `limit` messages from INBOX, then disconnects. */
export async function fetchRecentMessages(
  account: ImapAccount,
  limit = 10
): Promise<InboxMessage[]> {
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: {
      user: account.email,
      pass: account.appPassword,
    },
    logger: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox && "exists" in client.mailbox ? client.mailbox.exists : 0;
      if (total === 0) return [];

      const start = Math.max(1, total - limit + 1);
      const messages: InboxMessage[] = [];

      for await (const msg of client.fetch(`${start}:${total}`, { envelope: true, uid: true })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0]?.address ?? "(unknown sender)",
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        });
      }

      return messages.reverse();
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

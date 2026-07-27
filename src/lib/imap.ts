import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type InboxMessage = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
};

export type MessageDetail = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  text: string;
};

export type ImapAccount = {
  imap_host: string;
  imap_port: number;
  email: string;
  appPassword: string;
};

/** Mailbox identity at the moment we opened it. */
export type MailboxState = {
  uidValidity: number;
  uidNext: number;
  exists: number;
};

function createClient(account: ImapAccount): ImapFlow {
  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: { user: account.email, pass: account.appPassword },
    logger: false,
  });
}

/**
 * Connects, opens a mailbox read-only, runs `fn`, then always disconnects.
 *
 * `readOnly` makes the server issue EXAMINE rather than SELECT, so writes are
 * refused at the protocol level rather than merely never attempted.
 */
export async function withMailbox<T>(
  account: ImapAccount,
  mailbox: string,
  fn: (client: ImapFlow, state: MailboxState) => Promise<T>
): Promise<T> {
  const client = createClient(account);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(mailbox, { readOnly: true });
    try {
      const box = client.mailbox;
      if (!box || typeof box === "boolean") throw new Error(`Could not open ${mailbox}`);

      return await fn(client, {
        uidValidity: Number(box.uidValidity),
        uidNext: Number(box.uidNext),
        exists: box.exists,
      });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/** Fetches the most recent `limit` messages from INBOX, newest first. */
export async function fetchRecentMessages(
  account: ImapAccount,
  limit = 10
): Promise<InboxMessage[]> {
  return withMailbox(account, "INBOX", async (client, state) => {
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
}

/** Fetches and parses the full body of a single INBOX message by UID. */
export async function fetchMessageBody(
  account: ImapAccount,
  uid: number
): Promise<MessageDetail> {
  return withMailbox(account, "INBOX", async (client) => {
    const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!msg || !msg.source) throw new Error("Message not found");

    const parsed = await simpleParser(msg.source);
    const text = parsed.text ?? (parsed.html ? htmlToText(parsed.html) : "");

    return {
      uid,
      subject: parsed.subject ?? "(no subject)",
      from: parsed.from?.text ?? "(unknown sender)",
      to: Array.isArray(parsed.to)
        ? parsed.to.map((a) => a.text).join(", ")
        : parsed.to?.text ?? "",
      date: parsed.date ? parsed.date.toISOString() : null,
      text: text.trim() || "(no text content)",
    };
  });
}

/** Minimal HTML→text fallback for emails that only ship an HTML part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

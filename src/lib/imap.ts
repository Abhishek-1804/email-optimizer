import { ImapFlow } from "imapflow";

export type ImapAccount = {
  host: string;
  port: number;
  email: string;
  /** OAuth 2.0 access token. imapflow sends it as XOAUTH2. */
  accessToken: string;
};

/** Mailbox identity at the moment we opened it. */
export type MailboxState = {
  uidValidity: number;
  uidNext: number;
  exists: number;
};

/**
 * Deliberately not exported. Every mailbox is opened through `withMailbox`, so
 * there is exactly one place that can choose EXAMINE vs SELECT — see below.
 */
function createClient(account: ImapAccount): ImapFlow {
  return new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.email, accessToken: account.accessToken },
    logger: false,
  });
}

/**
 * Connects, opens a mailbox read-only, runs `fn`, then always disconnects.
 *
 * `readOnly` makes the server issue EXAMINE rather than SELECT, so writes are
 * refused at the protocol level rather than merely never attempted. IMAP has no
 * connection-wide read-only mode, so this is the narrowest place the guarantee
 * can live — and it holds even though the OAuth scope permits deletion.
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

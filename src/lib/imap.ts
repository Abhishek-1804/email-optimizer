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

/** Not exported: withMailbox is the only thing that may open a mailbox. */
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
 * Where "delete" operations move mail instead of deleting it, so every action
 * stays reversible from Gmail.
 */
export const SAFETY_FOLDER = "email-optimizer-nextjs";

/**
 * Connects, opens a mailbox, runs `fn`, always disconnects.
 *
 * Read-only by default: EXAMINE instead of SELECT, so the server refuses writes
 * even though our OAuth scope permits deletion. Passing `{ readOnly: false }` is
 * the only way to get a writable mailbox — grep for it to find every write.
 */
export async function withMailbox<T>(
  account: ImapAccount,
  mailbox: string,
  fn: (client: ImapFlow, state: MailboxState) => Promise<T>,
  options: { readOnly?: boolean } = {}
): Promise<T> {
  const client = createClient(account);
  await client.connect();

  try {
    // Throws if it already exists; either way the folder is there after this.
    await client.mailboxCreate(SAFETY_FOLDER).catch(() => {});

    const lock = await client.getMailboxLock(mailbox, {
      readOnly: options.readOnly ?? true,
    });
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

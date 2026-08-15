"use server";

import { loadImapCreds, imapError } from "@/lib/mailboxes";
import { fetchRecent } from "../utils/fetch-recent";
import type { MailboxError, InboxMessage, InboxResult } from "../types";

type PerMailbox =
  | { ok: true; messages: InboxMessage[] }
  | { ok: false; error: MailboxError };

/**
 * Recent messages across one or more mailboxes, newest first.
 *
 * One mailbox is just the single-element case — there is no separate path for
 * it. The ids come from the caller, but `loadImapCreds` scopes every lookup by
 * the signed-in user, so an id that isn't yours resolves to nothing.
 *
 * Mailboxes are read concurrently and each failure is captured rather than
 * thrown, so one mailbox with a revoked grant reports itself and the rest still renders.
 */
export async function listMessages(
  mailboxIds: string[],
  perMailbox = 25
): Promise<InboxResult> {
  const results = await Promise.all(
    mailboxIds.map(async (mailboxId): Promise<PerMailbox> => {
      let mailboxEmail: string | null = null;

      try {
        const creds = await loadImapCreds(mailboxId);
        mailboxEmail = creds.email;
        return { ok: true, messages: await fetchRecent(creds, mailboxId, perMailbox) };
      } catch (err) {
        console.error(`IMAP list failed for mailbox ${mailboxId}:`, err);
        return {
          ok: false,
          error: { mailboxId, mailboxEmail, message: imapError(err).message },
        };
      }
    })
  );

  const messages = results.flatMap((r) => (r.ok ? r.messages : []));
  const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));

  messages.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return { messages, errors };
}

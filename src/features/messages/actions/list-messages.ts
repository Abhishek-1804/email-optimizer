"use server";

import { loadImapCreds, imapError } from "@/lib/imap-credentials";
import { fetchRecent } from "../utils/fetch-recent";
import type { AccountError, InboxMessage, InboxResult } from "../types";

type PerAccount =
  | { ok: true; messages: InboxMessage[] }
  | { ok: false; error: AccountError };

/**
 * Recent messages across one or more mailboxes, newest first.
 *
 * One account is just the single-element case — there is no separate path for
 * it. The ids come from the caller, but `loadImapCreds` scopes every lookup by
 * the signed-in user, so an id that isn't yours resolves to nothing.
 *
 * Mailboxes are read concurrently and each failure is captured rather than
 * thrown, so one stale app password reports itself and the rest still renders.
 */
export async function listMessages(
  accountIds: number[],
  perAccount = 25
): Promise<InboxResult> {
  const results = await Promise.all(
    accountIds.map(async (accountId): Promise<PerAccount> => {
      let accountEmail: string | null = null;

      try {
        const creds = await loadImapCreds(accountId);
        accountEmail = creds.email;
        return { ok: true, messages: await fetchRecent(creds, accountId, perAccount) };
      } catch (err) {
        console.error(`IMAP list failed for account ${accountId}:`, err);
        return {
          ok: false,
          error: { accountId, accountEmail, message: imapError(err).message },
        };
      }
    })
  );

  const messages = results.flatMap((r) => (r.ok ? r.messages : []));
  const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));

  messages.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return { messages, errors };
}

/**
 * One row in the message list. Envelope data only — no body.
 *
 * Carries its account because the combined view mixes several mailboxes, and
 * a uid is only unique within one of them.
 */
export type InboxMessage = {
  accountId: string;
  accountEmail: string;
  uid: number;
  subject: string;
  from: string;
  date: string | null;
};

/** A single opened message, body included as plain text. */
export type MessageDetail = InboxMessage & {
  to: string;
  text: string;
};

/** One mailbox that could not be read, so the rest of the view still renders. */
export type AccountError = {
  accountId: string;
  /** null when the account row itself couldn't be loaded, so we never knew it. */
  accountEmail: string | null;
  message: string;
};

/** What a list request returns: whatever was readable, plus whatever wasn't. */
export type InboxResult = {
  messages: InboxMessage[];
  errors: AccountError[];
};

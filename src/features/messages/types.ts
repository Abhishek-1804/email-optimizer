/**
 * One row in the message list. Envelope data only — no body.
 *
 * Carries its mailbox because the combined view mixes several of them, and
 * a uid is only unique within one of them.
 */
export type InboxMessage = {
  mailboxId: string;
  mailboxEmail: string;
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
export type MailboxError = {
  mailboxId: string;
  /** null when the mailbox row itself couldn't be loaded, so we never knew it. */
  mailboxEmail: string | null;
  message: string;
};

/** What a list request returns: whatever was readable, plus whatever wasn't. */
export type InboxResult = {
  messages: InboxMessage[];
  errors: MailboxError[];
};

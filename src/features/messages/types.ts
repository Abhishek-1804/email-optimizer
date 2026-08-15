/** One list row. Envelope only. Carries its mailbox: a uid is unique only within one. */
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

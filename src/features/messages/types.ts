/** One row in the message list. Envelope data only — no body. */
export type InboxMessage = {
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

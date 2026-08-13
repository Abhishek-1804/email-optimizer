/**
 * A connected IMAP mailbox. Mirrors the columns of `email_accounts` that are
 * safe to send to the browser — notably not `app_password`.
 */
export type EmailAccount = {
  id: number;
  email: string;
  imap_host: string;
  imap_port: number;
  label: string | null;
  created_at: string;
};

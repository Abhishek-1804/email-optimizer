CREATE TABLE IF NOT EXISTS email_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  imap_host TEXT NOT NULL DEFAULT 'imap.gmail.com',
  imap_port INTEGER NOT NULL DEFAULT 993,
  app_password TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_clerk_user_id
  ON email_accounts (clerk_user_id);

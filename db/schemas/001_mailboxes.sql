-- Mailboxes connected through our own Google OAuth flow.
--
-- refresh_token is the only long-lived secret here: it grants full mailbox
-- access including delete, never expires on its own, and is encrypted at rest.
CREATE TABLE IF NOT EXISTS mailboxes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'google',
  email         TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scopes        TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  -- Reconnecting refreshes the row instead of duplicating it.
  UNIQUE (clerk_user_id, provider, email)
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_user ON mailboxes (clerk_user_id);

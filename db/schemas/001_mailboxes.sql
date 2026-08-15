-- Mailboxes connected through our own Google OAuth flow.
--
-- Clerk owns identity (clerk_user_id); it does not own mailbox access.
--
-- refresh_token is the only long-lived secret in this project. It grants full
-- mailbox access — including permanent delete — until the user revokes it from
-- their Google account, and it does not expire on its own. Encrypted at rest,
-- never logged, never sent to the browser.
CREATE TABLE IF NOT EXISTS mailboxes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'google',
  email         TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scopes        TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  -- Reconnecting the same mailbox refreshes the row instead of duplicating it.
  UNIQUE (clerk_user_id, provider, email)
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_user ON mailboxes (clerk_user_id);

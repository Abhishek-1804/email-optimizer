-- Header cache, one row per message. Bodies are never cached.
--
-- No sync cursor table: MAX(uid) per mailbox IS the cursor, and uid_validity on
-- each row makes stale generations self-identifying.
CREATE TABLE IF NOT EXISTS messages_metadata (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mailbox_id    INTEGER NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  folder        TEXT NOT NULL DEFAULT 'INBOX',
  uid           INTEGER NOT NULL,
  uid_validity  INTEGER NOT NULL,

  message_id    TEXT,
  subject       TEXT,
  from_name     TEXT,
  from_address  TEXT,
  "date"        TEXT,      -- ISO 8601, sorts lexicographically
  size          INTEGER,

  -- grouping signals, extracted at sync time
  list_id           TEXT,
  list_unsubscribe  TEXT,
  dkim_domain       TEXT,

  -- the fetched header block verbatim, so the classifier can be rewritten and
  -- re-run offline without another IMAP pass
  raw_headers   TEXT,

  -- classifier output, filled by a later pass
  group_key     TEXT,
  category      TEXT,
  bulk_score    INTEGER,

  UNIQUE (mailbox_id, folder, uid_validity, uid)
);

CREATE INDEX IF NOT EXISTS idx_messages_group ON messages_metadata (mailbox_id, group_key);
CREATE INDEX IF NOT EXISTS idx_messages_date  ON messages_metadata (mailbox_id, "date" DESC);

-- Local cache of synced mail: one row per message, plus a per-mailbox cursor.

-- Sync cursor, one row per (account, mailbox).
--
-- uid_validity is the load-bearing column: IMAP UIDs are only meaningful within
-- a UIDVALIDITY generation, so if the server bumps it every cached UID is stale
-- and the mailbox must be resynced from scratch.
CREATE TABLE IF NOT EXISTS mailbox_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES email_accounts (id) ON DELETE CASCADE,
  mailbox TEXT NOT NULL DEFAULT 'INBOX',
  uid_validity INTEGER NOT NULL,
  last_seen_uid INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  UNIQUE (account_id, mailbox)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES email_accounts (id) ON DELETE CASCADE,
  mailbox TEXT NOT NULL DEFAULT 'INBOX',
  uid INTEGER NOT NULL,
  uid_validity INTEGER NOT NULL,

  message_id TEXT,
  subject TEXT,
  from_name TEXT,
  from_address TEXT,
  to_addresses TEXT, -- JSON array
  "date" TEXT,       -- ISO 8601
  size INTEGER,      -- bytes on the server, not bytes stored here

  -- Signals we group and query on. Everything else stays in raw_headers.
  list_id TEXT,
  list_unsubscribe TEXT,
  dkim_domain TEXT,
  esp TEXT,
  in_reply_to TEXT,

  -- The requested header block verbatim, ~500 bytes. Kept so the classifier can
  -- be rewritten and re-run over a synced mailbox without a fresh IMAP pass.
  raw_headers TEXT,

  -- BODYSTRUCTURE part number of the text part, resolved during the header pass
  -- so the body pass fetches that part alone and leaves attachments behind.
  text_part TEXT,

  -- Classifier output, filled by a later pass. Nullable so it needs no migration.
  group_key TEXT,
  category TEXT, -- 'bulk' | 'transactional' | 'human' | 'unknown'
  bulk_score INTEGER,

  -- Extracted text only, never raw MIME and never attachments.
  body_text TEXT,
  body_fetched_at TEXT,

  synced_at TEXT NOT NULL DEFAULT (datetime ('now')),

  UNIQUE (account_id, mailbox, uid_validity, uid)
);

-- Drives the grouped dashboard.
CREATE INDEX IF NOT EXISTS idx_messages_group
  ON messages (account_id, group_key);

-- Sender rollups, and the group_key backfill itself.
CREATE INDEX IF NOT EXISTS idx_messages_from
  ON messages (account_id, from_address);

-- Reverse-chronological listing within an account or group.
CREATE INDEX IF NOT EXISTS idx_messages_date
  ON messages (account_id, "date" DESC);

-- Lets the body backfill find pending messages without a full scan.
CREATE INDEX IF NOT EXISTS idx_messages_body_pending
  ON messages (account_id, body_fetched_at)
  WHERE body_fetched_at IS NULL;

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// The schema. drizzle-kit generates migrations from this file, and every row
// type in the app is inferred from it — rename a column here and the compiler
// finds every query that used it.

/** Mailboxes connected through our own Google OAuth flow. */
export const mailboxes = sqliteTable(
  "mailboxes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clerkUserId: text("clerk_user_id").notNull(),
    provider: text("provider").notNull().default("google"),
    email: text("email").notNull(),
    /**
     * The only long-lived secret here: grants full mailbox access including
     * delete, never expires on its own, encrypted at rest.
     */
    refreshToken: text("refresh_token").notNull(),
    scopes: text("scopes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    // Makes reconnecting refresh the row instead of duplicating it.
    unique("mailboxes_user_provider_email").on(t.clerkUserId, t.provider, t.email),
    index("idx_mailboxes_user").on(t.clerkUserId),
  ]
);

/** Header cache, one row per message. Bodies are never cached. */
export const messages = sqliteTable(
  "messages_metadata",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mailboxId: integer("mailbox_id")
      .notNull()
      .references(() => mailboxes.id, { onDelete: "cascade" }),
    folder: text("folder").notNull().default("INBOX"),
    uid: integer("uid").notNull(),
    uidValidity: integer("uid_validity").notNull(),

    messageId: text("message_id"),
    subject: text("subject"),
    fromName: text("from_name"),
    fromAddress: text("from_address"),
    date: text("date"),
    size: integer("size"),

    // grouping signals, extracted at sync time
    listId: text("list_id"),
    listUnsubscribe: text("list_unsubscribe"),
    dkimDomain: text("dkim_domain"),

    // the fetched header block verbatim, so the classifier can be rewritten and
    // re-run offline without another IMAP pass
    rawHeaders: text("raw_headers"),

    // classifier output, filled by a later pass
    groupKey: text("group_key"),
    category: text("category"),
    bulkScore: integer("bulk_score"),

    /** NULL means still in `folder`; set means we moved it to the safety folder. */
    movedAt: text("moved_at"),
  },
  (t) => [
    unique("messages_uid").on(t.mailboxId, t.folder, t.uidValidity, t.uid),
    // Message-ID travels with the message; uid does not. Moving mail out and
    // back gives it a new uid each time, so this is what identifies it.
    unique("messages_message_id").on(t.mailboxId, t.messageId),
    index("idx_messages_group").on(t.mailboxId, t.groupKey),
    index("idx_messages_date").on(t.mailboxId, t.date),
    index("idx_messages_pending").on(t.mailboxId, t.movedAt),
  ]
);

/**
 * Sender rules. Scoped to the user, not a mailbox: blocking a sender is a
 * decision about you, and applies across every mailbox you connect.
 */
export const blocklist = sqliteTable(
  "blocklist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clerkUserId: text("clerk_user_id").notNull(),
    kind: text("kind", { enum: ["domain", "address"] }).notNull(),
    value: text("value").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    // Makes the block button idempotent.
    unique("blocklist_user_kind_value").on(t.clerkUserId, t.kind, t.value),
    index("idx_blocklist_user").on(t.clerkUserId),
  ]
);

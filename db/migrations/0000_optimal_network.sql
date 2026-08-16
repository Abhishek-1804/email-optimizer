CREATE TABLE `blocklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blocklist_user` ON `blocklist` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `blocklist_user_kind_value` ON `blocklist` (`clerk_user_id`,`kind`,`value`);--> statement-breakpoint
CREATE TABLE `mailboxes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_user_id` text NOT NULL,
	`provider` text DEFAULT 'google' NOT NULL,
	`email` text NOT NULL,
	`refresh_token` text NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mailboxes_user` ON `mailboxes` (`clerk_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mailboxes_user_provider_email` ON `mailboxes` (`clerk_user_id`,`provider`,`email`);--> statement-breakpoint
CREATE TABLE `messages_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mailbox_id` integer NOT NULL,
	`folder` text DEFAULT 'INBOX' NOT NULL,
	`uid` integer NOT NULL,
	`uid_validity` integer NOT NULL,
	`message_id` text,
	`subject` text,
	`from_name` text,
	`from_address` text,
	`date` text,
	`size` integer,
	`list_id` text,
	`list_unsubscribe` text,
	`dkim_domain` text,
	`raw_headers` text,
	`group_key` text,
	`category` text,
	`bulk_score` integer,
	`moved_at` text,
	FOREIGN KEY (`mailbox_id`) REFERENCES `mailboxes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_group` ON `messages_metadata` (`mailbox_id`,`group_key`);--> statement-breakpoint
CREATE INDEX `idx_messages_date` ON `messages_metadata` (`mailbox_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_messages_pending` ON `messages_metadata` (`mailbox_id`,`moved_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_uid` ON `messages_metadata` (`mailbox_id`,`folder`,`uid_validity`,`uid`);
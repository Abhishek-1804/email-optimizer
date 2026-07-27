/**
 * Header names that distinguish bulk mail from human mail.
 *
 * These tables exist to build `FETCH_HEADERS` — the set of fields we ask IMAP
 * for. Grouping them by meaning is what lets the classifier score them later.
 * Names are lowercase; RFC 5322 field names are case-insensitive.
 */

/** RFC 2369 / 2919 list headers. Presence alone is strong evidence of a bulk sender. */
export const LIST_HEADERS = [
  "list-unsubscribe",
  "list-unsubscribe-post",
  "list-id",
  "list-post",
  "list-help",
  "list-subscribe",
  "list-archive",
  "list-owner",
] as const;

/** Machine-sent markers. Value matters more than presence — these cover receipts too. */
export const AUTOMATION_HEADERS = [
  "precedence",
  "auto-submitted",
  "feedback-id",
  "x-auto-response-suppress",
] as const;

/** Vendor headers that only appear on mail pushed through a bulk-sending platform. */
export const ESP_HEADERS: Record<string, string> = {
  "x-ses-outgoing": "Amazon SES",
  "x-sg-eid": "SendGrid",
  "x-sg-id": "SendGrid",
  "x-mailgun-sid": "Mailgun",
  "x-mailgun-variables": "Mailgun",
  "x-mandrill-user": "Mandrill",
  "x-mc-user": "Mailchimp",
  "x-pm-message-id": "Postmark",
  "x-postmark-tag": "Postmark",
  "x-msys-api": "SparkPost",
  "x-klaviyo-message-id": "Klaviyo",
  "x-cm-envelope": "Campaign Monitor",
};

/** Campaign and abuse headers. Not vendor-specific, but no human MUA sets them. */
export const CAMPAIGN_HEADERS = [
  "x-campaign-id",
  "x-campaignid",
  "x-csa-complaints",
  "x-report-abuse",
  "x-report-abuse-to",
  "x-mailer",
] as const;

/**
 * Authentication results, stamped by our receiving server before we fetch — so
 * unlike sender-supplied headers these can be trusted. The `d=` tag of
 * `dkim-signature` is the authenticated sending domain, and the best group key.
 */
export const AUTH_HEADERS = ["authentication-results", "dkim-signature", "received-spf"] as const;

/** Server-side spam verdicts, when the provider stamps them. */
export const SPAM_VERDICT_HEADERS = [
  "x-spam-flag",
  "x-spam-status",
  "x-spam-score",
  "x-spam-level",
] as const;

/** Threading headers. Either one means a real conversation — never group these. */
export const HUMAN_HEADERS = ["in-reply-to", "references"] as const;

/** Bulk senders use VERP, so the bounce address differs from the `From:` domain. */
export const RETURN_PATH_HEADERS = ["return-path", "errors-to", "sender"] as const;

/**
 * The header set requested over IMAP. Derived from the tables above so adding a
 * signal starts fetching it automatically.
 */
export const FETCH_HEADERS: string[] = Array.from(
  new Set<string>([
    ...LIST_HEADERS,
    ...AUTOMATION_HEADERS,
    ...Object.keys(ESP_HEADERS),
    ...CAMPAIGN_HEADERS,
    ...AUTH_HEADERS,
    ...SPAM_VERDICT_HEADERS,
    ...HUMAN_HEADERS,
    ...RETURN_PATH_HEADERS,
    // Not signals, but needed to identify and group the message.
    "message-id",
    "from",
    "to",
    "cc",
    "date",
    "subject",
    "content-type",
  ])
);

import { and, countDistinct, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import db from "./client";
import { blocklist, mailboxes, messages } from "./schema";

// SQL for the blocklist table. Explicit ids in, rows out.

export type BlockKind = "domain" | "address" | "pattern";

export type BlockRule = {
  id: number;
  kind: BlockKind;
  value: string;
  createdAt: string;
  /** Cached messages still in the folder that this rule matches. */
  matches: number;
  /** Messages already moved to the safety folder under this rule. */
  moved: number;
};

// SQLite string functions Drizzle has no helper for.
const address = sql<string>`lower(${messages.fromAddress})`;
const domain = sql<string>`lower(substr(${messages.fromAddress}, instr(${messages.fromAddress}, '@') + 1))`;

/**
 * Whether a rule matches a message, by kind. Written once and reused, so the
 * count shown next to a rule and the set Apply moves can never disagree.
 */
const matchesRule = or(
  and(eq(blocklist.kind, "address"), eq(blocklist.value, address)),
  and(eq(blocklist.kind, "domain"), eq(blocklist.value, domain)),
  and(eq(blocklist.kind, "pattern"), sql`${messages.fromAddress} regexp ${blocklist.value}`)
)!;

/**
 * Rules with how much mail each one covers.
 *
 * A left join rather than correlated subqueries: inside a raw `sql` template
 * Drizzle does not qualify column names, and both blocklist and mailboxes have
 * an `id`, so the subquery form fails at runtime with "ambiguous column name".
 * Joining lets Drizzle alias everything itself.
 */
export function listForUser(userId: string): BlockRule[] {
  return db
    .select({
      id: blocklist.id,
      kind: blocklist.kind,
      value: blocklist.value,
      createdAt: blocklist.createdAt,
      // Count a column, not a literal: an unmatched left join yields a row of
      // NULLs, and `moved_at is null` is true for it.
      matches: sql<number>`count(case when ${messages.movedAt} is null then ${messages.id} end)`,
      moved: sql<number>`count(case when ${messages.movedAt} is not null then ${messages.id} end)`,
    })
    .from(blocklist)
    .leftJoin(mailboxes, eq(mailboxes.clerkUserId, blocklist.clerkUserId))
    .leftJoin(messages, and(eq(messages.mailboxId, mailboxes.id), matchesRule))
    .where(eq(blocklist.clerkUserId, userId))
    .groupBy(blocklist.id)
    .orderBy(desc(blocklist.createdAt))
    .all();
}

/**
 * Idempotent: the unique constraint makes a repeat click a no-op. Patterns are
 * stored verbatim — lowercasing `\S` would turn it into `\s` — and match
 * case-insensitively instead.
 */
export function add(userId: string, kind: BlockKind, value: string): void {
  db.insert(blocklist)
    .values({ clerkUserId: userId, kind, value: kind === "pattern" ? value : value.toLowerCase() })
    .onConflictDoNothing()
    .run();
}

export function remove(userId: string, id: number): void {
  db.delete(blocklist)
    .where(and(eq(blocklist.id, id), eq(blocklist.clerkUserId, userId)))
    .run();
}

/** Lowercased addresses and domains, and raw patterns, for badging rows in the drill-down. */
export function rulesForUser(userId: string): {
  addresses: Set<string>;
  domains: Set<string>;
  patterns: string[];
} {
  const rows = db
    .select({ kind: blocklist.kind, value: blocklist.value })
    .from(blocklist)
    .where(eq(blocklist.clerkUserId, userId))
    .all();

  return {
    addresses: new Set(rows.filter((r) => r.kind === "address").map((r) => r.value)),
    domains: new Set(rows.filter((r) => r.kind === "domain").map((r) => r.value)),
    patterns: rows.filter((r) => r.kind === "pattern").map((r) => r.value),
  };
}

/** Cached messages matching at least one rule, the part every pending query shares. */
function pendingWhere(userId: string, ruleId?: number) {
  return and(
    eq(mailboxes.clerkUserId, userId),
    isNull(messages.movedAt),
    ruleId === undefined ? undefined : eq(blocklist.id, ruleId)
  );
}

/**
 * How many messages Apply would move. Counted distinct: a message matched by
 * both an address rule and a pattern is one message, so summing the per-rule
 * counts would overstate it.
 */
export function pendingCountForUser(userId: string): number {
  return (
    db
      .select({ n: countDistinct(messages.id) })
      .from(messages)
      .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
      .innerJoin(blocklist, and(eq(blocklist.clerkUserId, mailboxes.clerkUserId), matchesRule))
      .where(pendingWhere(userId))
      .get()?.n ?? 0
  );
}

/** The messages Apply would move, newest first — every rule, or just one. */
export function pendingForUser(userId: string, ruleId?: number) {
  return db
    .selectDistinct({
      mailboxId: messages.mailboxId,
      mailboxEmail: mailboxes.email,
      uid: messages.uid,
      subject: messages.subject,
      fromAddress: messages.fromAddress,
      date: messages.date,
    })
    .from(messages)
    .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
    .innerJoin(blocklist, and(eq(blocklist.clerkUserId, mailboxes.clerkUserId), matchesRule))
    .where(pendingWhere(userId, ruleId))
    .orderBy(desc(messages.date))
    .all();
}

export function ruleForUser(userId: string, id: number) {
  return db
    .select({ id: blocklist.id, kind: blocklist.kind, value: blocklist.value })
    .from(blocklist)
    .where(and(eq(blocklist.id, id), eq(blocklist.clerkUserId, userId)))
    .get();
}

/** Cached messages in one mailbox matching any of the user's rules. */
export function matchingMessages(userId: string, mailboxId: number, folder: string) {
  return db
    .selectDistinct({ uid: messages.uid, fromAddress: messages.fromAddress })
    .from(messages)
    .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
    .innerJoin(
      blocklist,
      and(eq(blocklist.clerkUserId, mailboxes.clerkUserId), matchesRule)
    )
    .where(
      and(
        eq(mailboxes.clerkUserId, userId),
        eq(messages.mailboxId, mailboxId),
        eq(messages.folder, folder),
        isNull(messages.movedAt)
      )
    )
    .all();
}

export { isNotNull };

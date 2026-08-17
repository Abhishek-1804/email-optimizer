import { and, count, countDistinct, desc, eq, isNotNull, isNull, like, max, sql } from "drizzle-orm";
import db from "./client";
import { mailboxes, messages } from "./schema";

// SQL for messages_metadata. Same contract as db/mailboxes: explicit ids in,
// rows out, nothing else.

/** What a sync inserts. Inferred, so a schema change surfaces here. */
export type HeaderRow = Omit<
  typeof messages.$inferInsert,
  "id" | "mailboxId" | "folder" | "uidValidity"
>;

// SQLite string functions Drizzle has no helper for. Declared once each so the
// raw SQL lives in one place rather than at every call site.
const lower = (col: unknown) => sql<string>`lower(${col})`;

/** The sender domain, derived in SQL so grouping never needs a second pass. */
const domain = sql<string>`lower(substr(${messages.fromAddress}, instr(${messages.fromAddress}, '@') + 1))`;

/**
 * How machine-generated a message looks, from the headers bulk senders set.
 * In-Reply-To subtracts: a message in a reply chain is a conversation, which is
 * what separates people from machines on shared domains like gmail.com.
 *
 * Defined once and averaged per group, so the badge and the sort order can
 * never disagree.
 */
const bulkScore = sql<number>`(
    (CASE WHEN ${messages.listId} IS NOT NULL THEN 3 ELSE 0 END)
  + (CASE WHEN ${messages.listUnsubscribe} IS NOT NULL THEN 3 ELSE 0 END)
  + (CASE WHEN lower(${messages.rawHeaders}) LIKE '%list-unsubscribe-post%' THEN 2 ELSE 0 END)
  + (CASE WHEN lower(${messages.rawHeaders}) LIKE '%feedback-id:%' THEN 2 ELSE 0 END)
  + (CASE WHEN lower(${messages.rawHeaders}) LIKE '%precedence: bulk%'
            OR lower(${messages.rawHeaders}) LIKE '%precedence: list%' THEN 1 ELSE 0 END)
  + (CASE WHEN lower(${messages.rawHeaders}) LIKE '%auto-submitted:%'
           AND lower(${messages.rawHeaders}) NOT LIKE '%auto-submitted: no%' THEN 1 ELSE 0 END)
  - (CASE WHEN lower(${messages.rawHeaders}) LIKE '%in-reply-to:%' THEN 3 ELSE 0 END)
)`;

/** Mean score across a group, rounded to one decimal. Shown on the row. */
const avgScore = sql<number>`round(avg(${bulkScore}), 1)`;

/**
 * Messages in a group that look like junk. This is what the lists sort by —
 * "how much would blocking this remove", not "how junky is the junkiest".
 * Sorting by the mean instead floats one-message senders with a perfect score
 * above a sender with 646 real ones.
 */
const junkCount = sql<number>`coalesce(sum(CASE WHEN ${bulkScore} >= 3 THEN 1 ELSE 0 END), 0)`;

/**
 * Where a sync should resume from, and which UID generation the cache holds.
 * Counts moved rows too — MAX(uid) is where the folder got to, regardless of
 * what we have since moved out of it.
 */
export function syncState(mailboxId: number, folder: string) {
  const row = db
    .select({
      uidValidity: max(messages.uidValidity),
      lastUid: max(messages.uid),
      count: count(),
    })
    .from(messages)
    .where(and(eq(messages.mailboxId, mailboxId), eq(messages.folder, folder)))
    .get();

  return {
    uidValidity: row?.uidValidity ?? null,
    lastUid: row?.lastUid ?? null,
    count: row?.count ?? 0,
  };
}

/** Wipes one mailbox's cache — used when UIDVALIDITY changes. */
export function deleteForMailbox(mailboxId: number, folder: string): void {
  db.delete(messages)
    .where(and(eq(messages.mailboxId, mailboxId), eq(messages.folder, folder)))
    .run();
}

export function insertBatch(
  mailboxId: number,
  folder: string,
  uidValidity: number,
  rows: HeaderRow[]
): void {
  if (rows.length === 0) return;

  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(messages)
        .values({ ...row, mailboxId, folder, uidValidity })
        // A message dragged back from the safety folder returns with a new uid,
        // so it looks new. Message-ID identifies it: update where it now lives
        // and clear moved_at, rather than adding a second row.
        .onConflictDoUpdate({
          target: [messages.mailboxId, messages.messageId],
          set: { uid: sql`excluded.uid`, movedAt: sql`NULL` },
        })
        .run();
    }
  });
}

/** Still in the folder — moved mail is excluded from every user-facing count. */
export function countForMailbox(mailboxId: number, folder: string): number {
  return (
    db
      .select({ n: count() })
      .from(messages)
      .where(
        and(
          eq(messages.mailboxId, mailboxId),
          eq(messages.folder, folder),
          isNull(messages.movedAt)
        )
      )
      .get()?.n ?? 0
  );
}

/** Totals across all of a user's mailboxes. */
export function statsForUser(userId: string) {
  return (
    db
      .select({ messages: count(), bulk: junkCount })
      .from(messages)
      .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
      .where(and(eq(mailboxes.clerkUserId, userId), isNull(messages.movedAt)))
      .get() ?? { messages: 0, bulk: 0 }
  );
}

/** One row per sender domain, biggest first. */
export function domainGroupsForUser(userId: string) {
  return db
    .select({
      domain,
      senders: countDistinct(lower(messages.fromAddress)),
      messages: count(),
      bulk: junkCount,
      score: avgScore,
      latest: max(messages.date),
    })
    .from(messages)
    .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
    .where(
      and(
        eq(mailboxes.clerkUserId, userId),
        isNull(messages.movedAt),
        like(messages.fromAddress, "%@%")
      )
    )
    .groupBy(domain)
    .orderBy(desc(junkCount), desc(count()))
    .all();
}

/** One row per sender address within a domain, biggest first. */
export function addressGroupsForUser(userId: string, dom: string) {
  const address = lower(messages.fromAddress);

  return db
    .select({
      address,
      name: max(messages.fromName),
      messages: count(),
      bulk: junkCount,
      score: avgScore,
      latest: max(messages.date),
    })
    .from(messages)
    .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
    .where(
      and(
        eq(mailboxes.clerkUserId, userId),
        isNull(messages.movedAt),
        eq(domain, dom.toLowerCase())
      )
    )
    .groupBy(address)
    .orderBy(desc(junkCount), desc(count()))
    .all();
}

/** Every cached message from one sender, newest first. */
export function bySenderForUser(userId: string, address: string) {
  return db
    .select({
      mailboxId: messages.mailboxId,
      mailboxEmail: mailboxes.email,
      uid: messages.uid,
      subject: messages.subject,
      fromAddress: messages.fromAddress,
      date: messages.date,
    })
    .from(messages)
    .innerJoin(mailboxes, eq(mailboxes.id, messages.mailboxId))
    .where(
      and(
        eq(mailboxes.clerkUserId, userId),
        isNull(messages.movedAt),
        eq(lower(messages.fromAddress), address.toLowerCase())
      )
    )
    .orderBy(desc(messages.date))
    .all();
}

/** Stamps rows as moved rather than deleting them. */
export function markMoved(mailboxId: number, folder: string, uids: number[]): void {
  if (uids.length === 0) return;

  db.transaction((tx) => {
    for (const uid of uids) {
      tx.update(messages)
        .set({ movedAt: sql`datetime('now')` })
        .where(
          and(
            eq(messages.mailboxId, mailboxId),
            eq(messages.folder, folder),
            eq(messages.uid, uid)
          )
        )
        .run();
    }
  });
}

export { isNotNull };

import { and, asc, eq, sql } from "drizzle-orm";
import db from "./client";
import { mailboxes } from "./schema";

// SQL for the mailboxes table. Nothing else: no auth, no crypto, no IMAP.
// Every function takes an explicit userId — scoping is the caller's job to
// provide and this layer's job to apply.

export type MailboxRow = typeof mailboxes.$inferSelect;

export function listForUser(userId: string): MailboxRow[] {
  return db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.clerkUserId, userId))
    .orderBy(asc(mailboxes.createdAt))
    .all();
}

export function getForUser(userId: string, id: number): MailboxRow | undefined {
  return db
    .select()
    .from(mailboxes)
    .where(and(eq(mailboxes.id, id), eq(mailboxes.clerkUserId, userId)))
    .get();
}

/** Insert, or replace the grant if this user already connected this address. */
export function upsertGrant(
  userId: string,
  email: string,
  encryptedRefreshToken: string,
  scopes: string
): void {
  db.insert(mailboxes)
    .values({
      clerkUserId: userId,
      provider: "google",
      email: email.toLowerCase(),
      refreshToken: encryptedRefreshToken,
      scopes,
    })
    .onConflictDoUpdate({
      target: [mailboxes.clerkUserId, mailboxes.provider, mailboxes.email],
      set: { refreshToken: sql`excluded.refresh_token`, scopes: sql`excluded.scopes` },
    })
    .run();
}

/** Cascades to messages_metadata via the FK. */
export function deleteForUser(userId: string, id: number): void {
  db.delete(mailboxes)
    .where(and(eq(mailboxes.id, id), eq(mailboxes.clerkUserId, userId)))
    .run();
}

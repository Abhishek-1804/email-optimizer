"use server";

import { listMailboxes as load, type Mailbox } from "@/lib/imap-credentials";

/**
 * The mailboxes connected to the signed-in user.
 *
 * There is no local table behind this — Clerk is the source of truth, so a
 * mailbox appears the moment it is connected and disappears when revoked.
 */
export async function listMailboxes(): Promise<Mailbox[]> {
  return load();
}

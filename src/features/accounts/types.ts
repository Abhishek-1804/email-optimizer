/**
 * Re-exported so the feature has one obvious place for its types. It can't live
 * in the action file: a "use server" module may only export async functions,
 * and a type export there fails the build rather than being erased.
 */
export type { Mailbox } from "@/lib/imap-credentials";

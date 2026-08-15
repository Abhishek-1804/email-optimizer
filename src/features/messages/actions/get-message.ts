"use server";

import { simpleParser } from "mailparser";
import { withMailbox } from "@/lib/imap";
import { loadImapCreds, imapError } from "@/lib/mailboxes";
import { htmlToText } from "../utils/html-to-text";
import type { MessageDetail } from "../types";

/** One message by UID, parsed down to plain text. */
export async function getMessage(mailboxId: string, uid: number): Promise<MessageDetail> {
  const creds = await loadImapCreds(mailboxId);

  try {
    return await withMailbox(creds, "INBOX", async (client) => {
      // BODY.PEEK, not BODY — `source: true` on a read-only mailbox leaves
      // \Seen untouched, so opening a message here does not mark it read.
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) throw new Error("Message not found");

      const parsed = await simpleParser(msg.source);
      const text = parsed.text ?? (parsed.html ? htmlToText(parsed.html) : "");

      return {
        mailboxId,
        mailboxEmail: creds.email,
        uid,
        subject: parsed.subject ?? "(no subject)",
        from: parsed.from?.text ?? "(unknown sender)",
        to: Array.isArray(parsed.to)
          ? parsed.to.map((a) => a.text).join(", ")
          : parsed.to?.text ?? "",
        date: parsed.date ? parsed.date.toISOString() : null,
        text: text.trim() || "(no text content)",
      };
    });
  } catch (err) {
    console.error(`IMAP fetch failed for mailbox ${mailboxId}, uid ${uid}:`, err);
    throw imapError(err);
  }
}

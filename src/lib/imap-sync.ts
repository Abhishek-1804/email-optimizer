/**
 * The two IMAP passes behind the local cache.
 *
 * Both take an already-open client so the caller controls the connection and
 * can interleave database writes. See `sync.ts` for the orchestration.
 */

import type { ImapFlow, FetchMessageObject, MessageStructureObject } from "imapflow";
import { ESP_HEADERS, FETCH_HEADERS } from "./signals";
import { htmlToText } from "./imap";
import { parseHeaderBlock, headerValue, dkimDomain, normalizeListId } from "./headers";

/** One message from the header pass — metadata and signals, no body. */
export type SyncedHeader = {
  uid: number;
  messageId: string | null;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  toAddresses: string[];
  date: string | null;
  size: number | null;
  listId: string | null;
  listUnsubscribe: string | null;
  dkimDomain: string | null;
  esp: string | null;
  inReplyTo: string | null;
  rawHeaders: string;
  textPart: string | null;
};

/**
 * Finds the body text part, preferring `text/plain` over `text/html`.
 *
 * Skipping attachment parts is the point: fetching this one part is what leaves
 * images and attachments on the server.
 */
function pickTextPart(node: MessageStructureObject | undefined): string | null {
  if (!node) return null;

  let plain: string | null = null;
  let html: string | null = null;

  const walk = (current: MessageStructureObject) => {
    if (current.childNodes && current.childNodes.length > 0) {
      current.childNodes.forEach(walk);
      return;
    }

    if ((current.disposition ?? "").toLowerCase() === "attachment") return;

    // Single-part messages have no part number; ImapFlow maps "1" to TEXT.
    const part = current.part || "1";
    const type = (current.type ?? "").toLowerCase();

    if (type === "text/plain" && !plain) plain = part;
    else if (type === "text/html" && !html) html = part;
  };

  walk(node);
  return plain ?? html;
}

function toSyncedHeader(msg: FetchMessageObject): SyncedHeader {
  const rawHeaders = msg.headers ? msg.headers.toString("utf-8") : "";
  const headers = parseHeaderBlock(rawHeaders);
  const espHeader = Object.keys(ESP_HEADERS).find((name) => headers.has(name));

  return {
    uid: msg.uid,
    messageId: msg.envelope?.messageId ?? null,
    subject: msg.envelope?.subject ?? null,
    fromName: msg.envelope?.from?.[0]?.name ?? null,
    fromAddress: msg.envelope?.from?.[0]?.address?.toLowerCase() ?? null,
    toAddresses: (msg.envelope?.to ?? []).map((a) => a.address ?? "").filter(Boolean),
    date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
    size: msg.size ?? null,
    listId: normalizeListId(headerValue(headers, "list-id")),
    listUnsubscribe: headerValue(headers, "list-unsubscribe"),
    dkimDomain: dkimDomain(headers),
    esp: espHeader ? ESP_HEADERS[espHeader] : null,
    inReplyTo: msg.envelope?.inReplyTo ?? headerValue(headers, "in-reply-to"),
    rawHeaders,
    textPart: pickTextPart(msg.bodyStructure),
  };
}

/**
 * Pass 1: yields metadata and grouping signals in batches, for every message
 * after `sinceUid`.
 *
 * Requests only ENVELOPE, BODYSTRUCTURE, size and `FETCH_HEADERS` — around half
 * a kilobyte per message, no body transfer. Batching keeps a large mailbox from
 * having to fit in memory.
 */
export async function* headerBatches(
  client: ImapFlow,
  sinceUid: number,
  batchSize = 500
): AsyncGenerator<SyncedHeader[]> {
  const query = {
    uid: true,
    envelope: true,
    size: true,
    bodyStructure: true,
    headers: FETCH_HEADERS,
  };

  let batch: SyncedHeader[] = [];

  for await (const msg of client.fetch(`${sinceUid + 1}:*`, query, { uid: true })) {
    // `UID FETCH n:*` always returns the last message even when n is past the
    // highest UID, so an up-to-date mailbox yields one stale result.
    if (msg.uid <= sinceUid) continue;

    batch.push(toSyncedHeader(msg));

    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) yield batch;
}

/** Caps how much of a part we pull over the wire. */
const MAX_BODY_BYTES = 256 * 1024;

/** Caps what we keep. Bulk mail is boilerplate; the tail adds size, not signal. */
const MAX_STORED_TEXT_CHARS = 32 * 1024;

/**
 * Pass 2: downloads one message's text part, or null if there is nothing to store.
 *
 * `download` decodes transfer-encoding, format=flowed and charset for us, and
 * stops at `maxBytes`.
 */
export async function downloadTextPart(
  client: ImapFlow,
  uid: number,
  textPart: string | null
): Promise<string | null> {
  if (!textPart) return null;

  try {
    const result = await client.download(String(uid), textPart, {
      uid: true,
      maxBytes: MAX_BODY_BYTES,
    });

    if (!result || !result.content) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of result.content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const raw = Buffer.concat(chunks).toString("utf-8");
    const text = result.meta?.contentType === "text/html" ? htmlToText(raw) : raw;

    return text.trim().slice(0, MAX_STORED_TEXT_CHARS);
  } catch (err) {
    // One unreadable message must not abort a backfill of thousands.
    console.error(`Body fetch failed for uid ${uid}:`, err);
    return null;
  }
}

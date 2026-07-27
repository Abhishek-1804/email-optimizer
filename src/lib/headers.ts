/** Parsing for the raw header block IMAP returns per message. */

export type HeaderMap = Map<string, string[]>;

/**
 * Parses a raw RFC 5322 header block into lowercase name -> values.
 *
 * Unfolds continuation lines (a line starting with space or tab continues the
 * previous field) and collects repeated headers rather than overwriting.
 */
export function parseHeaderBlock(raw: Buffer | string | null | undefined): HeaderMap {
  const headers: HeaderMap = new Map();
  if (!raw) return headers;

  const lines = raw.toString().split(/\r?\n/);
  let current: string | null = null;
  let buffer = "";

  const flush = () => {
    if (current === null) return;
    const existing = headers.get(current);
    if (existing) existing.push(buffer.trim());
    else headers.set(current, [buffer.trim()]);
    current = null;
    buffer = "";
  };

  for (const line of lines) {
    if (/^[ \t]/.test(line)) {
      if (current !== null) buffer += " " + line.trim();
      continue;
    }

    flush();

    const sep = line.indexOf(":");
    if (sep === -1) continue;

    current = line.slice(0, sep).trim().toLowerCase();
    buffer = line.slice(sep + 1);
  }

  flush();
  return headers;
}

/** First value of a header, or null. */
export function headerValue(headers: HeaderMap, name: string): string | null {
  const values = headers.get(name.toLowerCase());
  return values && values.length > 0 ? values[0] : null;
}

/** The `d=` tag of a DKIM-Signature: the domain that actually signed the message. */
export function dkimDomain(headers: HeaderMap): string | null {
  for (const signature of headers.get("dkim-signature") ?? []) {
    const match = /(?:^|;)\s*d=([^;\s]+)/i.exec(signature);
    if (match) return match[1].trim().toLowerCase().replace(/\.$/, "");
  }

  return null;
}

/**
 * Strips the optional human-readable phrase from a List-Id, keeping the stable
 * bracketed identifier: `Widget News <announce.widget.com>` -> `announce.widget.com`.
 */
export function normalizeListId(value: string | null): string | null {
  if (!value) return null;

  const bracketed = /<([^>]+)>/.exec(value);
  return (bracketed ? bracketed[1] : value).trim().toLowerCase() || null;
}

import { auth, clerkClient } from "@clerk/nextjs/server";
import type { ImapAccount } from "@/lib/imap";

/** Full read/write Gmail access. Google rejects anything but this exact string. */
export const GMAIL_SCOPE = "https://mail.google.com/";

/** Per-provider IMAP endpoints. Only providers listed here can be used as mailboxes. */
const IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  google: { host: "imap.gmail.com", port: 993 },
  microsoft: { host: "outlook.office365.com", port: 993 },
};

/** A connected mailbox, as Clerk knows it. Nothing here is stored by us. */
export type Mailbox = {
  /** The `eac_` id. Tokens key on this, not on the account's `idn_` id. */
  externalAccountId: string;
  email: string;
  provider: string;
  /** False when the account was connected before the mail scope was added. */
  hasMailScope: boolean;
};

/** Clerk reports providers as `oauth_google`; the SDK takes `google`. */
function providerSlug(provider: string): string {
  return provider.replace(/^oauth_/, "");
}

/** Every mailbox connected to the signed-in user. */
export async function listMailboxes(): Promise<Mailbox[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await (await clerkClient()).users.getUser(userId);

  return user.externalAccounts
    .filter((acc) => providerSlug(acc.provider) in IMAP_HOSTS)
    .map((acc) => ({
      // `id` is the idn_ identification; externalAccountId is the eac_ one.
      externalAccountId: acc.externalAccountId ?? acc.id,
      email: acc.emailAddress,
      provider: providerSlug(acc.provider),
      hasMailScope: (acc.approvedScopes ?? "").includes(GMAIL_SCOPE),
    }));
}

/**
 * Exchanges a connected mailbox for live IMAP credentials.
 *
 * Clerk holds the refresh token and mints a fresh access token here, so nothing
 * long-lived is ever stored by this app. Scoped to the signed-in user, so an id
 * that isn't theirs resolves to nothing.
 */
export async function loadImapCreds(externalAccountId: string): Promise<ImapAccount> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const account = user.externalAccounts.find(
    (acc) => (acc.externalAccountId ?? acc.id) === externalAccountId
  );
  if (!account) throw new Error("Mailbox not found");

  const provider = providerSlug(account.provider);
  const endpoint = IMAP_HOSTS[provider];
  if (!endpoint) throw new Error(`${provider} mailboxes are not supported yet`);

  const { data: tokens } = await client.users.getUserOauthAccessToken(
    userId,
    provider as Parameters<typeof client.users.getUserOauthAccessToken>[1]
  );

  const token = tokens.find((t) => t.externalAccountId === externalAccountId) ?? tokens[0];
  if (!token) throw new Error("No access token for this mailbox. Reconnect it.");

  if (token.scopes && !token.scopes.includes(GMAIL_SCOPE)) {
    throw new Error(
      `${account.emailAddress} is connected but has not granted mail access. Reconnect it.`
    );
  }

  return {
    host: endpoint.host,
    port: endpoint.port,
    email: account.emailAddress,
    accessToken: token.token,
  };
}

/** Turns an IMAP or token failure into something a person can act on. */
export function imapError(err: unknown): Error {
  const e = err as { authenticationFailed?: boolean; responseText?: string; code?: string };

  if (e?.authenticationFailed) {
    return new Error(
      "The mailbox rejected this token. Disconnect and reconnect the account to grant " +
        "mail access again." + (e.responseText ? ` Server said: ${e.responseText}` : "")
    );
  }

  if (e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT") {
    return new Error(`Could not reach the mail server (${e.code}).`);
  }

  return err instanceof Error ? err : new Error("Could not open this mailbox.");
}

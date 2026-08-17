import { OAuth2Client } from "google-auth-library";

// Google OAuth for mailbox access. Clerk owns sign-in; this owns a separate
// grant with its own consent screen, so signing in never asks for mail access.

/** Full mailbox access. Google rejects anything but this exact string. */
export const GMAIL_SCOPE = "https://mail.google.com/";

/** `openid email` so the callback learns which mailbox was just connected. */
const SCOPES = ["openid", "email", GMAIL_SCOPE];

function client(redirectUri: string): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

/**
  * Where to send the browser to start a connection.
  *
  * `access_type: offline` is what returns a refresh token at all. `consent`
  * forces a fresh one — without it only the first authorization gets one, so
  * reconnects would store nothing. `select_account` shows the chooser.
  */
export function authorizeUrl(redirectUri: string, state: string): string {
  return client(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent select_account",
    scope: SCOPES,
    include_granted_scopes: true,
    state,
  });
}

export type ConnectedMailbox = {
  email: string;
  refreshToken: string;
  scopes: string;
};

/** Trades the one-time code for tokens, and says which mailbox they belong to. */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<ConnectedMailbox> {
  const oauth = client(redirectUri);
  const { tokens } = await oauth.getToken(code);

  if (!tokens.refresh_token) {
    // An access token alone dies within the hour, so refuse to store it.
    throw new Error(
      "Google returned no refresh token. Remove this app at " +
        "myaccount.google.com/permissions and connect again."
    );
  }

  if (!tokens.id_token) throw new Error("Google did not say which account was connected");

  // Verified, not decoded: checks Google's signature and our client id.
  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const email = ticket.getPayload()?.email;
  if (!email) throw new Error("Google did not say which account was connected");

  return {
    email,
    refreshToken: tokens.refresh_token,
    scopes: tokens.scope ?? "",
  };
}

/**
 * Access tokens last about an hour, so they're cached in memory for their
 * lifetime — otherwise every IMAP operation pays a round trip to Google before
 * it can open a socket.
 *
 * In memory rather than in the database on purpose: a second live credential on
 * disk is a liability, and a process restart simply re-mints.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Renew this long before expiry, so a token can't die mid-IMAP-session. */
const RENEW_BEFORE_MS = 5 * 60_000;

/** Mints a short-lived access token, or returns a cached one still in date. */
export async function accessTokenFor(refreshToken: string): Promise<string> {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expiresAt - RENEW_BEFORE_MS > Date.now()) return cached.token;

  const oauth = client("");
  oauth.setCredentials({ refresh_token: refreshToken });

  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error("Could not refresh access to this mailbox");

  // Google returns expiry_date as epoch ms; fall back to a conservative hour.
  const expiresAt = oauth.credentials.expiry_date ?? Date.now() + 60 * 60_000;
  tokenCache.set(refreshToken, { token, expiresAt });

  return token;
}

/** Best-effort revoke, so disconnecting actually ends the grant at Google. */
export async function revokeToken(refreshToken: string): Promise<void> {
  tokenCache.delete(refreshToken);

  try {
    await client("").revokeToken(refreshToken);
  } catch {
    // Deleted regardless: a token we no longer hold is unusable to us.
  }
}

/** Name of the httpOnly cookie holding the CSRF `state` during a connection. */
export const STATE_COOKIE = "mailbox_oauth_state";

/**
 * Derived from the incoming request so localhost and production each send the
 * URI they were reached on. Google matches this string exactly against the
 * authorized redirect URIs, so both must be registered in the Cloud console.
 */
export function callbackUrl(request: Request): string {
  return new URL("/api/mailboxes/callback", request.url).toString();
}

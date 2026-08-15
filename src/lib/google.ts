import { OAuth2Client } from "google-auth-library";

/**
 * Google OAuth for mailbox access, run by us rather than by Clerk.
 *
 * Clerk still owns sign-in. This owns mailbox authorization — a separate grant
 * with its own consent screen, so signing in never asks for mail access.
 */

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
 * `access_type: "offline"` is what makes Google return a refresh token at all.
 * `prompt` does two jobs: `select_account` shows the chooser so a second
 * mailbox is reachable, and `consent` forces a fresh grant — without it Google
 * returns a refresh token only on the very first authorization, so reconnecting
 * would silently store nothing.
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
    // Almost always a missing access_type, or a re-auth without prompt=consent.
    // An access token alone would stop working within the hour.
    throw new Error(
      "Google returned no refresh token. Remove this app at " +
        "myaccount.google.com/permissions and connect again."
    );
  }

  if (!tokens.id_token) throw new Error("Google did not say which account was connected");

  // Verified, not merely decoded: checks Google's signature and that the token
  // was issued for our client.
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

/** Mints a short-lived access token. Called per request; nothing is cached. */
export async function accessTokenFor(refreshToken: string): Promise<string> {
  const oauth = client("");
  oauth.setCredentials({ refresh_token: refreshToken });

  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error("Could not refresh access to this mailbox");

  return token;
}

/** Best-effort revoke, so disconnecting actually ends the grant at Google. */
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await client("").revokeToken(refreshToken);
  } catch {
    // The row is deleted regardless: a token we no longer hold is unusable to
    // us, and the user can always revoke from their Google account.
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

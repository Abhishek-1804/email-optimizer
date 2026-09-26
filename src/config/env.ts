import "server-only";

// Every env var the app reads, in one place. `server-only` makes importing this
// from a client component a build error, so a secret can't reach the browser.
//
// Clerk's keys aren't here: Clerk reads its own from process.env.
//
// Getters, not values: each var is checked when first used rather than at
// import, so `next build` — which imports every route — doesn't need secrets.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example.`);
  return value;
}

export const env = {
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  /** 32 bytes, base64. Decoded and length-checked in lib/crypto. */
  get tokenEncryptionKey() {
    return required("TOKEN_ENCRYPTION_KEY");
  },
};

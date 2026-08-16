# Email Optimizer

A multi-account email client for **bulk spam filtering**. Connect several
mailboxes over IMAP (Gmail first) and clean them up from one dashboard,
instead of unsubscribing and deleting inbox-by-inbox.

Two filtering approaches, both working:

1. **Header-based grouping** — `List-Unsubscribe` marks bulk mail, so
   newsletters and promos declare themselves. Group by sender, review, act.
2. **Manual block-list** — block a domain or an address; their mail moves to a
   folder in your own mailbox.

> **Status: v0.** Sign in, connect Gmail accounts, sync their headers, group
> them by sender, and block senders — whose mail is *moved to a folder*, never
> deleted. Built against the conventions in [CONTRIBUTING.md](CONTRIBUTING.md).

## What works today

- **Sign in with Clerk** — identity only. Signing in asks for nothing more than
  your name and email.
- **Connect mailboxes separately** — a Google OAuth flow of our own, run per
  mailbox. Connect as many Gmail accounts as you like to one login, and read
  them together in a combined inbox.
- **No passwords anywhere** — no app password to generate or paste. Google
  issues a refresh token, which is encrypted at rest with AES-256-GCM; access
  tokens are minted per request and never stored.
- **Group and block by sender** — synced headers are grouped by sender domain,
  then by address, then down to individual messages you review yourself.
- **Nothing is ever deleted** — mailboxes open with `EXAMINE` (read-only at the
  protocol level) everywhere except one function. Blocking moves mail into an
  `email-optimizer-nextjs` folder in your own mailbox, recoverable from Gmail at
  any time.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Clerk](https://clerk.com) for sign-in
- [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)
  for the mailbox OAuth flow
- [imapflow](https://imapflow.com) for IMAP over XOAUTH2
- [mailparser](https://nodemailer.com/extras/mailparser/) for MIME
- [Drizzle](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the local header cache
- [Tailwind CSS v4](https://tailwindcss.com) for styling

## Getting started

This project is **self-contained**: the only tool you need preinstalled is
[`just`](https://github.com/casey/just). It downloads Node.js and sqlite3
(checksum-verified) into `bin/`, so nothing pollutes your system.

```bash
just dev
```

That downloads the toolchain, installs dependencies, and starts the dev
server at [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` (git-ignored) with:

```bash
# From `clerk init` / your Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# From your Google Cloud OAuth client (see below)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 32 random bytes, base64. Encrypts stored Google refresh tokens.
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TOKEN_ENCRYPTION_KEY=...
```

> **Do not regenerate `TOKEN_ENCRYPTION_KEY` casually.** Every refresh token in
> `data/app.db` is encrypted with it; change it and each connected mailbox has
> to be reconnected.

### Google OAuth setup

Mailbox access is a separate grant from sign-in, and needs your own Google Cloud
OAuth client.

1. **Google Cloud** → new project → OAuth consent screen (External).
2. Add the scope `https://mail.google.com/` — the full URL, trailing slash
   included. Bare `mail.google.com` is rejected with `invalid_scope`.
3. Set publishing status to **In production**. Left in *Testing*, Google expires
   refresh tokens after 7 days and every user must reconnect weekly.
4. Create an **OAuth client ID → Web application** with the authorized redirect
   URI `http://localhost:3000/api/mailboxes/callback` (add your deployed origin
   too, when there is one).
5. Copy the client ID and secret into `.env.local`.

Clerk needs no Google configuration — leave its Google connection on shared
credentials, or off entirely. It only ever handles sign-in.

Until the app is verified by Google you'll see an "unverified app" interstitial
and are capped at 100 users. That is expected; restricted Gmail scopes require
verification before public launch.

## Commands (`just`)

| Command | Description |
| --- | --- |
| `just dev` | Install toolchain + deps, run the dev server |
| `just build` | Production build |
| `just lint` | ESLint (flat config) |
| `just db-generate` | Write a migration for whatever changed in `schema.ts` |
| `just db-check` | Check whether `schema.ts` and `db/migrations` agree |
| `just install-deps` | Download the pinned toolchain into `bin/`, then `npm install` |
| `just clean` | Remove deps, lockfile, build output, `bin/` — keeps `data/` |
| `just clean-data` | Drop the local database and its connected mailboxes |
| `just clean-all` | Both of the above |

## Project layout

```
src/app/                     Routing only
  dashboard/                 Connected mailboxes (protected)
  dashboard/[mailboxId]/     One inbox
  dashboard/all/             Every inbox, merged
  api/mailboxes/connect/     Starts the Google consent flow
  api/mailboxes/callback/    Receives it, stores the refresh token
  dashboard/filter/          Grouped senders: domain -> address -> messages
  dashboard/blocklist/       Block rules and the Apply button
src/features/mailboxes/      Connecting, listing, syncing
src/features/messages/       Reading mail
src/features/filtering/      Grouping and blocking
src/components/ui/           Button, input, card
src/lib/db/schema.ts         The schema; types and migrations both derive from it
src/lib/db/*.ts              SQL only, private to lib/
src/lib/mailboxes.ts         Mailbox service: auth, tokens, IMAP credentials
src/lib/message-cache.ts     Header cache: sync in, grouped reads out
src/lib/blocklist.ts         Block rules, and the one write (Apply)
src/lib/google.ts            All Google OAuth
src/lib/imap.ts              IMAP client factory + read-only wrapper
src/lib/crypto.ts            AES-256-GCM for stored refresh tokens
src/proxy.ts                 Clerk middleware (protects /dashboard)
db/migrations/               Generated by drizzle-kit
hack/install-deps.sh         Toolchain bootstrap
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for where new code goes as this grows —
the feature-folder layout, the one-directional import rule, and the safety
constraints that apply because these are real mailboxes.

## Roadmap

- Smarter grouping — `List-Id` and DKIM `d=` on top of the From domain, to split
  human mail out of the big shared-domain buckets
- Real deletion, behind a feature flag. Until then every "delete" is a move
- Outlook, via the same OAuth path (`microsoft` is already wired in)
- Google OAuth verification, required before serving more than 100 users

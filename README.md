# Email Optimizer

A multi-account email client for **bulk spam filtering**. Connect several
mailboxes over IMAP (Gmail first) and clean them up from one dashboard,
instead of unsubscribing and deleting inbox-by-inbox.

Two filtering approaches are planned:

1. **Manual block-list** — you curate a list of senders/patterns to filter.
2. **Header-based suggestions** — detect `List-Unsubscribe` (and similar)
   headers to surface what's safe to bulk-filter automatically.

> **Status: v0, deliberately reset.** Auth, multi-account storage and the IMAP
> client are in place. A first pass at message sync and grouping was built and
> then removed — it outgrew its structure. It is being rebuilt feature by
> feature against the conventions in [CONTRIBUTING.md](CONTRIBUTING.md); the
> notes from the first attempt are in `todo.txt`.

## What works today

- **Sign in with Clerk** — identity only. Signing in asks for nothing more than
  your name and email.
- **Connect mailboxes separately** — a Google OAuth flow of our own, run per
  mailbox. Connect as many Gmail accounts as you like to one login, and read
  them together in a combined inbox.
- **No passwords anywhere** — no app password to generate or paste. Google
  issues a refresh token, which is encrypted at rest with AES-256-GCM; access
  tokens are minted per request and never stored.
- **Read-only IMAP by construction** — mailboxes are opened with `EXAMINE`, so
  the server refuses writes at the protocol level. Nothing in this codebase can
  modify or delete mail, even though the OAuth scope would permit it.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Clerk](https://clerk.com) for sign-in
- [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)
  for the mailbox OAuth flow
- [imapflow](https://imapflow.com) for IMAP over XOAUTH2
- [mailparser](https://nodemailer.com/extras/mailparser/) for MIME
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the one local table
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
src/features/mailboxes/      Listing and disconnecting mailboxes
src/features/messages/       Reading them
src/components/ui/           Button, input, card
src/lib/google.ts            All Google OAuth
src/lib/mailboxes.ts         The mailboxes table, scoped to the signed-in user
src/lib/imap.ts              IMAP client factory + read-only wrapper
src/lib/crypto.ts            AES-256-GCM for stored refresh tokens
src/lib/db.ts                SQLite, applies db/schemas/*.sql
src/proxy.ts                 Clerk middleware (protects /dashboard)
db/schemas/                  One table
hack/install-deps.sh         Toolchain bootstrap
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for where new code goes as this grows —
the feature-folder layout, the one-directional import rule, and the safety
constraints that apply because these are real mailboxes.

## Roadmap

- Group messages by mailing list (`List-Unsubscribe`, `List-Id`, DKIM `d=`)
- Bulk delete per group, gated hard — the first write this app will ever make
- Manual block-list to filter chosen senders across all mailboxes
- Local message cache so grouping doesn't re-fetch over IMAP every time
- Outlook, via the same OAuth path (`microsoft` is already wired in)
- Google OAuth verification, required before serving more than 100 users

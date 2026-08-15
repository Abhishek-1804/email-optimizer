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

- **Sign in with Google** — via [Clerk](https://clerk.com). Signing in *is*
  connecting your mailbox; there is no second setup step.
- **Multiple mailboxes** — connect more Gmail accounts from the dashboard and
  read them together in one combined inbox.
- **Nothing sensitive is stored** — this app has no database. Clerk holds the
  OAuth refresh token and mints a short-lived access token per request; no
  password, no app password, and nothing to leak.
- **Read-only IMAP by construction** — mailboxes are opened with `EXAMINE`, so
  the server refuses writes at the protocol level. Nothing in this codebase can
  modify or delete mail, even though the OAuth scope would permit it.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Clerk](https://clerk.com) for auth *and* Google OAuth token custody
- [imapflow](https://imapflow.com) for IMAP over XOAUTH2
- [mailparser](https://nodemailer.com/extras/mailparser/) for MIME
- [Tailwind CSS v4](https://tailwindcss.com) for styling

## Getting started

This project is **self-contained**: the only tool you need preinstalled is
[`just`](https://github.com/casey/just). It downloads Node.js
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
```

That's the whole list. Google's client ID and secret live in the Clerk
dashboard, not here — this app never talks to Google directly.

### Google OAuth setup

Mailbox access needs your own Google Cloud OAuth client, because Clerk's shared
development credentials cannot request Gmail scopes.

1. **Google Cloud** → new project → OAuth consent screen (External).
2. Add the scope `https://mail.google.com/` — the full URL, trailing slash
   included. Bare `mail.google.com` is rejected with `invalid_scope`.
3. Set publishing status to **In production**. Left in *Testing*, Google expires
   refresh tokens after 7 days and every user must reconnect weekly.
4. Create an **OAuth client ID → Web application**, and add Clerk's callback as
   an authorized redirect URI (Clerk shows the exact value).
5. **Clerk** → SSO Connections → Google → *Use custom credentials* → paste the
   client ID and secret, and add `https://mail.google.com/` to the scopes.

Until the app is verified by Google you'll see an "unverified app" interstitial
and are capped at 100 users. That is expected; restricted Gmail scopes require
verification before public launch.

## Commands (`just`)

| Command | Description |
| --- | --- |
| `just dev` | Install toolchain + deps, run the dev server |
| `just build` | Production build |
| `just lint` | ESLint (flat config) |
| `just install-deps` | Download Node.js into `bin/`, then `npm install` |
| `just clean` | Remove `node_modules`, lockfile, build output |
| `just clean-bin` | Wipe the downloaded toolchain in `bin/` |
| `just sync-agent-files` | Copy `CLAUDE.md` to the other agent-config filenames |

## Project layout

```
src/app/                     Routing only
  dashboard/                 Connected mailboxes (protected)
  dashboard/[accountId]/     One inbox
  dashboard/all/             Every inbox, merged
  sso-callback/              Where Google returns after consent
src/features/accounts/       Connecting and listing mailboxes
src/features/messages/       Reading them
src/components/ui/           Button, input, card
src/lib/imap.ts              IMAP client factory + read-only wrapper
src/lib/imap-credentials.ts  Clerk token -> IMAP credentials
src/proxy.ts                 Clerk middleware (protects /dashboard)
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

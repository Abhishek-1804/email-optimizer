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

- **Auth** — sign in / sign up via [Clerk](https://clerk.com).
- **Multiple accounts** — add and remove IMAP mailboxes from the dashboard.
  Your Clerk login is separate from the mailboxes you connect: one account
  can hold many mailboxes, and the email you log in with is not auto-added.
- **Credentials encrypted at rest** — app passwords are stored with
  AES-256-GCM (never plaintext, never sent back to the browser).
- **Read-only IMAP by construction** — mailboxes are opened with `EXAMINE`, so
  the server refuses writes at the protocol level. Nothing in this codebase can
  modify or delete mail.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Clerk](https://clerk.com) for authentication
- [imapflow](https://imapflow.com) for IMAP
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- [Tailwind CSS v4](https://tailwindcss.com) for styling

## Getting started

This project is **self-contained**: the only tool you need preinstalled is
[`just`](https://github.com/casey/just). It downloads Node.js and the sqlite3
CLI (checksum-verified) into `bin/`, so nothing pollutes your system.

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

# 32 random bytes, base64. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_PASSWORD_ENCRYPTION_KEY=...
```

### Connecting a Gmail account

Gmail requires an **app password** for IMAP — your regular password will be
rejected. Enable 2-Step Verification, then generate a 16-character app
password at <https://myaccount.google.com/apppasswords> and use that when
adding the account.

## Commands (`just`)

| Command | Description |
| --- | --- |
| `just dev` | Install toolchain + deps, run the dev server |
| `just build` | Production build |
| `just lint` | ESLint (flat config) |
| `just install-deps` | Download Node.js + sqlite3 into `bin/`, then `npm install` |
| `just clean` | Remove `node_modules`, lockfile, build output, local db |
| `just clean-bin` | Wipe the downloaded toolchain in `bin/` |
| `just sync-agent-files` | Copy `CLAUDE.md` to the other agent-config filenames |

## Project layout

```
src/app/                 App Router pages
  page.tsx               Landing page
  dashboard/             Account management (protected)
  sign-in, sign-up/      Clerk auth pages
src/lib/
  db.ts                  SQLite connection, applies db/schemas/*.sql
  crypto.ts              AES-256-GCM encrypt/decrypt for app passwords
  imap.ts                IMAP client factory + read-only mailbox wrapper
src/proxy.ts             Clerk middleware (protects /dashboard)
db/schemas/              SQL schema, numbered and idempotent
hack/install-deps.sh     Toolchain bootstrap
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for where new code goes as this grows —
the feature-folder layout, the one-directional import rule, and the safety
constraints that apply because these are real mailboxes.

## Roadmap

- Manual block-list to filter chosen senders across all accounts
- `List-Unsubscribe` header detection to suggest bulk-filter candidates
- Incremental IMAP sync (track last-seen UID) instead of re-fetching
- OAuth for mailbox connections (replacing app passwords)
- Encrypt with a rotatable key / move off local SQLite for real deployments

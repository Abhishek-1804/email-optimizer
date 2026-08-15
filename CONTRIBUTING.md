# Contributing

This project got reset. A working IMAP sync, a SQLite message cache, a signals
layer and an inbox preview were all deleted in one go — not because they were
broken, but because they grew faster than the structure holding them, and
nobody could say where a new file was supposed to go anymore.

So this file is the structure, written down *before* the code comes back. It
follows [bulletproof-react](https://github.com/alan2207/bulletproof-react),
adapted to the Next.js App Router.

Read it before adding a feature. The deleted work and the notes that came with
it are in `todo.txt`.

---

## The tools

| Tool | Used for | Notes |
| --- | --- | --- |
| [Next.js 16](https://nextjs.org) (App Router) + React 19 | Framework | Server components by default. `params` and `searchParams` are Promises — `await` them. |
| [Clerk](https://clerk.com) | Sign-in only | `src/proxy.ts` protects `/dashboard`. Every server action re-checks `auth()` — middleware is not authorization. Clerk knows nothing about mailboxes. |
| [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) | The mailbox OAuth flow | Google's own. Wrapped by `src/lib/google.ts`. Use `verifyIdToken()` rather than decoding a JWT by hand. |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | One table, holding encrypted refresh tokens | **Synchronous** — no `await` on queries. |
| [imapflow](https://imapflow.com) | IMAP over XOAUTH2 | Wrapped by `src/lib/imap.ts`, which is the only place a mailbox is opened. |
| [mailparser](https://nodemailer.com/extras/mailparser/) | MIME parsing | Email is a swamp of encodings and multipart nesting. Never hand-parse it. |
| [Tailwind v4](https://tailwindcss.com) | Styling | Configured via `postcss.config.mjs` — remove that file and the build still passes while emitting an empty stylesheet. |
| [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) | `src/utils/cn.ts` | `twMerge` resolves conflicting utilities so a `className` prop actually overrides a component default. |

**On adding more.** Reach for a package when the problem is genuinely solved
elsewhere and getting it wrong is subtle — MIME parsing, Tailwind class
conflicts, IMAP. Don't reach for one to save a dozen lines of code you fully
understand. Two current judgement calls, so they don't get re-litigated
silently:

- **`src/lib/crypto.ts` stays hand-written.** It's ~40 lines of textbook
  AES-256-GCM on Node's built-in `crypto` — the vetted primitive *is* the
  library, and every alternative wraps the same call. Its real gap is key
  rotation: change `TOKEN_ENCRYPTION_KEY` and every stored refresh token becomes
  undecryptable. If rotation ever matters, that's when a keyring library earns
  its place, not before.
- **No ORM, and no migration runner.** One table, a handful of queries. The
  `.sql` file *is* the schema, replayed on boot. Change it and you delete
  `data/app.db` and reconnect — two clicks. Both decisions get revisited when
  the message cache lands and there's data that costs real time to rebuild; the
  ORM candidate then is Drizzle (sync driver, types inferred from a TS schema)
  rather than Prisma.

---

## The shape we're aiming for

```sh
src
|
+-- app             # routing ONLY — pages, layouts, route handlers
|
+-- components      # shared UI used by more than one feature
|
+-- config          # env vars and global constants, read in one place
|
+-- features        # feature modules — most code lives here
|
+-- hooks           # shared hooks
|
+-- lib             # preconfigured clients and wrappers (db, imap, crypto)
|
+-- types           # shared types
|
+-- utils           # shared pure helpers
```

A feature owns everything it needs:

```sh
src/features/grouping
|
+-- actions         # server actions (this project's API layer)
+-- components      # UI scoped to this feature
+-- hooks           # hooks scoped to this feature
+-- types           # types scoped to this feature
+-- utils           # pure logic — the parts worth unit testing
```

Only create the folders a feature actually needs. An empty `hooks/` is noise.

### Where it actually is right now

```sh
src/app/                          routing only
  page.tsx                        landing
  dashboard/page.tsx              thin route: mailboxes + connect link
  dashboard/[accountId]/page.tsx  thin route: one inbox
  dashboard/all/page.tsx          thin route: every inbox, merged
  api/mailboxes/connect/route.ts  starts Google consent
  api/mailboxes/callback/route.ts receives it, stores the refresh token
  sign-in|sign-up/                Clerk catch-alls

src/features/accounts/
  actions/disconnect-mailbox.ts
  components/mailbox-list.tsx

src/features/messages/
  actions/{list-messages,get-message}.ts
  components/{inbox-view,message-list,message-viewer}.tsx
  utils/{fetch-recent,html-to-text}.ts
  types.ts

src/components/ui/                button, input, card
src/utils/cn.ts                   clsx + tailwind-merge
src/lib/google.ts                 all Google OAuth
src/lib/mailboxes.ts              the table, scoped to the signed-in user
src/lib/imap.ts                   IMAP client factory + read-only wrapper
src/lib/crypto.ts                 AES-256-GCM
src/lib/db.ts                     SQLite, applies db/schemas/*.sql
src/proxy.ts                      Clerk middleware, protects /dashboard
db/schemas/001_mailboxes.sql      one table
```

Three things worth reading as worked examples of the rules below:

- **`src/lib/mailboxes.ts` is the only thing that touches its table**, and every
  exported function scopes itself to the signed-in user. Callers never pass a
  user id, so callers can't get the scoping wrong.
- **`mailbox-list.tsx` links to `/dashboard/[accountId]`** instead of rendering
  the message list itself. Composition happens at the route; the accounts
  feature never learns the messages feature exists.
- **The connect button is a plain `<a>`,** not a client component. It leaves the
  app for Google, so there is nothing to manage in React.

Deliberately absent for v0 — `config/`, `hooks/`, `types/`, and any `error.tsx`
or `loading.tsx`. Failures currently fall through to Next's default page and
navigation hangs silently during the IMAP round trip. Add them when hardening.

---

## The four rules

### 1. `src/app` is routing, not code

App Router folders map to URLs. Keep `page.tsx` thin: it resolves params, calls
into a feature, and renders. The moment a page file starts holding logic, that
logic belongs in `src/features/<name>/`.

Next.js *lets* you colocate anything under `app/` — a folder is only routable
once it contains `page.tsx` or `route.ts` — but "allowed" isn't "organized".
Use `(groups)` for URL-free grouping and `_private` folders if you do colocate.

### 2. Code flows one direction

```
lib / components / utils / types  →  features  →  app
```

Shared code never imports from features. Features never import from `app`.
Follow the arrows and you can always answer "what breaks if I change this?"
by looking rightward only.

This is enforced, not remembered — `eslint.config.mjs` runs
`import/no-restricted-paths` over `src/`, and `just lint` fails on a violation.
The `eslint-import-resolver-typescript` setting is what makes it see through the
`@/*` alias; without it every aliased import is invisible to the rule.

**Adding a feature means adding a zone.** The cross-feature entry is per-feature,
so a new `src/features/x` is unguarded until you add its line:

```js
// eslint.config.mjs
'import/no-restricted-paths': [
  'error',
  {
    zones: [
      // features can't import from app
      { target: './src/features', from: './src/app' },

      // shared modules can't import from features or app
      {
        target: ['./src/components', './src/hooks', './src/lib', './src/types', './src/utils'],
        from: ['./src/features', './src/app'],
      },

      // one entry per feature: no cross-feature imports
      { target: './src/features/grouping', from: './src/features', except: ['./grouping'] },
    ],
  },
],
```

### 3. Features don't import each other

If `grouping` needs something from `accounts`, that thing is not
feature-specific — promote it to `lib/`, `utils/`, or `components/`. Compose
features at the `app` layer, where the page can pull from both.

This is the rule that keeps the reset from happening again. Two features that
import each other are one feature wearing a disguise.

### 4. No barrel files

Import the file, not an `index.ts` that re-exports a folder. Barrels defeat
tree-shaking, blur what actually depends on what, and quietly turn a feature
folder into a public API you didn't mean to publish.

```ts
import { groupBySender } from '@/features/grouping/utils/group-by-sender'; // yes
import { groupBySender } from '@/features/grouping';                       // no
```

---

## Where does this file go?

| It's… | It goes in |
| --- | --- |
| A page or route | `src/app/<route>/page.tsx` |
| A configured third-party client | `src/lib/` |
| Logic only one feature uses | `src/features/<name>/` |
| A component two features use | `src/components/` |
| A pure function, no React, no I/O | `src/utils/` or the feature's `utils/` |
| An env var | `src/config/` — read `process.env` in one place, not scattered |
| A DB table or column change | `db/schemas/NNN_name.sql`. There is no migration runner: edit the file, delete `data/app.db`, reconnect |
| A shared class string | A component in `src/components/ui/`, not a `const` you import |

When torn between shared and feature-local, **start feature-local**. Promoting
later is easy; un-sharing a wrong abstraction is not.

---

## Server actions are the API layer

This app has no HTTP API — server actions are it. Treat them the way
bulletproof-react treats request declarations:

- One file per action, named after what it does, in the feature's `actions/`.
- Every action re-checks auth. Never trust the caller.
- Every action scopes queries by `clerk_user_id`. An id from the client is an
  *input*, not proof of ownership.
- Export explicit types for arguments and return values, so callers infer them.
- Actions return data or throw; the component decides how to show the error.

```ts
'use server';

export async function getGroups(accountId: number): Promise<Group[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  // ...scoped by userId, always
}
```

Keep the SQL and the IMAP calls out of the action body once either grows past a
few lines — the action orchestrates, a `utils/` or `lib/` function does the work.
That split is what makes the logic testable without a live mailbox.

---

## Components

- **Server components by default.** Add `'use client'` only when you need state,
  effects, or event handlers, and push it to the smallest leaf that needs it.
- Colocate a component with the feature that uses it until a second feature
  needs it.
- No nested render functions. If a chunk of JSX is a unit, it's a component.
- Few props. Many props usually means the component should be split, or should
  take `children`.
- Tailwind for styling, consistently. No stray CSS files.

## State

Pick the narrowest kind that works:

| Kind | Use |
| --- | --- |
| Server data | Fetch in a server component; `revalidatePath` after mutations |
| URL state | Filters, selected ids, tabs — survives reload and is shareable |
| Form state | `useActionState` / `useTransition` around the action |
| Component state | `useState`, as local as possible |

There is no global store, and this app is unlikely to need one. Don't add one
speculatively.

## Errors

- Throw meaningful errors from actions; map library errors into human sentences
  at the boundary rather than leaking them raw. (The deleted `imapError` did
  this well — see `todo.txt`.)
- Use `error.tsx` per route segment so one failure doesn't blank the app.
- Log the real error server-side, show the user the useful part.

## Testing

None set up yet. When it's time, the priority order is:

1. **Unit** — pure functions in `utils/`: classification, grouping keys, header
   parsing. Highest value here by far, and the reason logic doesn't live in
   action bodies.
2. **Integration** — a feature's components with actions mocked.
3. **E2E** — the few flows that must never break: sign in, add account, and
   (once it exists) delete.

Vitest + React Testing Library, Playwright for E2E.

---

## Non-negotiables for this project

These connect to **real mailboxes**. They are not style preferences.

- **IMAP stays read-only.** Mailboxes are opened through `withMailbox` in
  `src/lib/imap.ts`, which passes `readOnly: true` so the server issues
  `EXAMINE` instead of `SELECT` and refuses writes at the protocol level. IMAP
  has no connection-wide read-only mode, so this wrapper is the guarantee.
  `createClient` is intentionally not exported.
- **Delete gets its own path.** When bulk delete lands, it must add a separate,
  obviously-named read-write helper — never relax `withMailbox`. Anything that
  can destroy mail should be impossible to reach by accident.
- **Never log access tokens.** They're short-lived but they open the mailbox.
  Never print one, return it to the browser, or write it to a log. When
  debugging auth, log *shape* only: length, prefix, granted scopes.
- **One credential is stored, and only one.** The Google refresh token, in
  `mailboxes.refresh_token`, encrypted. It does not expire and it grants full
  mailbox access including delete, so that column is the crown jewels. Access
  tokens are minted per request and must never be persisted or logged.
- **Never commit `.env.local` or `data/`.** The first holds
  `TOKEN_ENCRYPTION_KEY`, the second holds everything it encrypts; together they
  are full access to every connected mailbox. `.gitignore` is a conventional denylist,
  which means anything new is tracked *by default* — so when you add a file
  that holds secrets or local state, adding the ignore rule is part of the same
  change, not a follow-up. Check with `git status` before every commit.

---

## Before you commit

- [ ] `just lint` and `just build` both pass
- [ ] New code sits in a feature folder, not in `app/`
- [ ] No cross-feature imports, no new barrel files
- [ ] Actions check auth and scope by `clerk_user_id`
- [ ] Nothing new writes to a mailbox
- [ ] Dead code deleted, not commented out — git remembers it
- [ ] `todo.txt` updated if you finished or deferred something

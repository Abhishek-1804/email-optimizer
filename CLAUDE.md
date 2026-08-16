<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working on this repo

Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding a feature — it defines the
folder structure, the one-directional import rule, and why things are where they
are. `just lint` enforces the layering, so a violation fails the build.

## These are real mailboxes

- **Never delete mail.** `withMailbox` opens `EXAMINE` (read-only at the
  protocol level) by default. Passing `{ readOnly: false }` is the only way to
  get a writable mailbox — grep for it to find every write. There is currently
  exactly one, in `applyBlocklist`.
- **"Delete" means move.** Blocked mail goes to the `email-optimizer-nextjs`
  folder in the user's own mailbox, so every action is reversible from Gmail.
  Real deletion stays behind a feature flag until the very last moment.
- **Never log or return a token.** The Google refresh token in
  `mailboxes.refresh_token` is encrypted at rest and grants permanent full
  access. When debugging auth, log shape only — length, prefix, scopes.

## Schema changes

`src/lib/db/schema.ts` is the source of truth. Edit it, run `just db-generate`,
restart. Never hand-write SQL migrations or `ALTER` a live database. `just dev`
warns if the schema has drifted from `db/migrations`.

## Verifying

`tsc` and the build are not sufficient for query changes — they validate shapes,
not SQL semantics. Both passed on a query that failed at runtime with "ambiguous
column name", and on a `LEFT JOIN` that counted phantom rows. Run new queries
against a scratch database with seeded rows.

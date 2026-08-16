#!/usr/bin/env bash
# Warns when src/lib/db/schema.ts has drifted from db/migrations — i.e. you
# edited the schema but never ran `just db-generate`.
#
# Compares outcomes, not text: applies the migrations to one throwaway database
# and the schema to another, then diffs what SQLite ended up with.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -d db/migrations ] || exit 0

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# sqlite_master, ordered by name so creation order doesn't matter.
DUMP="SELECT type, name, sql FROM sqlite_master
      WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'
      ORDER BY name;"

for f in db/migrations/*.sql; do sqlite3 "$TMP/migrations.db" < "$f"; done
npx drizzle-kit export --sql 2>/dev/null | sqlite3 "$TMP/schema.db"

sqlite3 "$TMP/migrations.db" "$DUMP" > "$TMP/a.txt"
sqlite3 "$TMP/schema.db" "$DUMP" > "$TMP/b.txt"

if ! diff -q "$TMP/a.txt" "$TMP/b.txt" >/dev/null; then
  echo
  echo "⚠  schema.ts has drifted from db/migrations."
  diff "$TMP/a.txt" "$TMP/b.txt" | sed 's/^/     /' | head -20
  echo
  echo "   Run 'just db-generate' to write the migration, then restart."
  echo
fi

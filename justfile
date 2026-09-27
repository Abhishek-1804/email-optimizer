# node/npm/npx/sqlite3 come from mise.toml — mise puts the pinned versions on
# PATH inside this repo, never a system install.

set shell := ["bash", "-euo", "pipefail", "-c"]

# Everything a server needs before it starts: npm deps, and a warning if
# schema.ts needs a new migration. Run in the body, not as dependencies, so
# npm install finishes before the check needs drizzle-kit.
setup:
    npm install
    ./hack/check-schema.sh

# Run the Next.js dev server.
dev: setup
    npm run dev

# Write a migration for whatever changed in src/lib/db/schema.ts.
db-generate:
    npx drizzle-kit generate

# Check whether schema.ts and db/migrations agree.
db-check:
    ./hack/check-schema.sh

# Production build.
build: setup
    npm run build

# Useful when dev-mode styling looks wrong: this is the output that ships.
#
# Build, then serve it on :3000.
start: build
    npm run start

# Lint with ESLint (flat config).
lint:
    npm run lint

# Deliberately leaves data/ alone: the mailboxes in it cost a Google consent
# round trip each to restore. Use `just clean-data` when you actually mean it.
#
# Remove regenerable files (deps, lockfile, build output, IDE).
clean:
    rm -rf node_modules .next out build coverage .vscode
    rm -f package-lock.json ./*.tsbuildinfo next-env.d.ts ./*.log
    find . -name .DS_Store -not -path "./.git/*" -delete
    echo "Cleaned. Run 'just dev' to reinstall and start."

# You reconnect each mailbox from the dashboard afterwards.
#
# Drop the local database, connected mailboxes and all.
clean-data:
    rm -rf data
    echo "Local database removed. Reconnect your mailboxes from the dashboard."

# Everything: regenerable files and the database.
clean-all: clean clean-data
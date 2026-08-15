# All recipes run with bin/ on PATH, so node/npm/npx/sqlite3 resolve to the
# self-contained toolchain (see hack/install-deps.sh), never a system install.

set shell := ["bash", "-euo", "pipefail", "-c"]

bin_dir := justfile_directory() + "/bin"
export PATH := bin_dir + ":" + env_var('PATH')

# Download the pinned toolchain (node, npm, sqlite3) into bin/, then npm install.
install-deps:
    ./hack/install-deps.sh

# Run the Next.js dev server.
dev: install-deps
    npm run dev

# Production build.
build:
    npm run build

# Lint with ESLint (flat config).
lint:
    npm run lint

# Deliberately leaves data/ alone: the mailboxes in it cost a Google consent
# round trip each to restore. Use `just clean-data` when you actually mean it.
#
# Remove regenerable files (deps, lockfile, build output, IDE, bin).
clean:
    rm -rf node_modules .next out build coverage .idea .vscode
    rm -f package-lock.json ./*.tsbuildinfo next-env.d.ts ./*.log
    find . -name .DS_Store -not -path "./.git/*" -delete
    rm -rf "{{bin_dir}}"
    echo "Cleaned. Run 'just dev' to reinstall and start."

# You reconnect each mailbox from the dashboard afterwards.
#
# Drop the local database, connected mailboxes and all.
clean-data:
    rm -rf data
    echo "Local database removed. Reconnect your mailboxes from the dashboard."

# Everything: regenerable files and the database.
clean-all: clean clean-data
# All recipes run with bin/ on PATH, so node/npm/npx/sqlite3 resolve to the
# self-contained toolchain (see hack/install-deps.sh), never a system install.

set shell := ["bash", "-euo", "pipefail", "-c"]

bin_dir := justfile_directory() + "/bin"
export PATH := bin_dir + ":" + env_var('PATH')

# Download Node.js + sqlite3 into bin/, then npm install.
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

# Remove regenerable files (deps, lockfile, build output, local db, bin).
clean:
    rm -rf node_modules .next data
    rm -f package-lock.json ./*.tsbuildinfo next-env.d.ts
    rm -rf "{{bin_dir}}"
    echo "Cleaned. Run 'just dev' to reinstall and start."
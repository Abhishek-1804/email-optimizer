#!/usr/bin/env bash
# Downloads every binary this project needs into bin/, at pinned versions, then
# installs npm dependencies with them. Idempotent: skips anything already there.
# `just clean` removes bin/ to force a fresh pull.
#
# The only tool you need beforehand is `just`.
set -euo pipefail

# ---- pinned versions. bump these to upgrade ----
NODE_VERSION="v24.19.0"     # LTS; ships npm and npx
SQLITE_YEAR="2026"          # sqlite.org files releases under a year
SQLITE_VERSION="3530400"    # 3.53.4

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$ROOT/bin"
mkdir -p "$BIN"
cd "$ROOT"

# Must come before npm install, or npm resolves to the system Node and builds
export PATH="$BIN:$PATH"

case "$(uname -s)" in
  Darwin) OS=darwin; SQLITE_OS=osx ;;
  Linux)  OS=linux;  SQLITE_OS=linux ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64)        ARCH=x64 ;;
  arm64|aarch64) ARCH=arm64 ;;
  *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac

# ---- Node.js ----
if [ -x "$BIN/node" ]; then
  echo "node $("$BIN/node" --version) already present"
else
  echo "Downloading node ${NODE_VERSION} (${OS}-${ARCH})..."
  mkdir -p "$BIN/node-dist"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS}-${ARCH}.tar.gz" \
    | tar -xz -C "$BIN/node-dist" --strip-components=1
  ln -sf node-dist/bin/node "$BIN/node"
  ln -sf node-dist/bin/npm  "$BIN/npm"
  ln -sf node-dist/bin/npx  "$BIN/npx"
  echo "Installed node $("$BIN/node" --version)"
fi

# ---- sqlite3 CLI (for inspecting data/app.db; the app uses better-sqlite3) ----
if [ -x "$BIN/sqlite3" ]; then
  echo "sqlite3 $("$BIN/sqlite3" --version | awk '{print $1}') already present"
elif [ "$SQLITE_OS-$ARCH" = "linux-arm64" ]; then
  echo "sqlite.org ships no linux-arm64 build; skipping (the app does not need it)"
else
  ZIP="sqlite-tools-${SQLITE_OS}-${ARCH}-${SQLITE_VERSION}.zip"
  echo "Downloading ${ZIP}..."
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  curl -fsSL "https://www.sqlite.org/${SQLITE_YEAR}/${ZIP}" -o "$TMP/s.zip"
  unzip -q "$TMP/s.zip" -d "$TMP"
  cp "$(find "$TMP" -name sqlite3 -type f | head -1)" "$BIN/sqlite3"
  chmod +x "$BIN/sqlite3"
  # These builds are unsigned; macOS refuses quarantined binaries.
  xattr -d com.apple.quarantine "$BIN/sqlite3" 2>/dev/null || true
  echo "Installed sqlite3 $("$BIN/sqlite3" --version | awk '{print $1}')"
fi

echo "Using node $(node --version), npm $(npm --version)"
npm install

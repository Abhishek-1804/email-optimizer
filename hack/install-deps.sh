#!/usr/bin/env bash
# Downloads a self-contained toolchain (Node.js + npm/npx, sqlite3 CLI) from
# upstream into bin/, then runs npm install. Idempotent: skips any binary
# already present. Run `just clean-bin` to force a fresh pull.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT/bin"
mkdir -p "$BIN_DIR"
cd "$ROOT"

OS_RAW="$(uname -s)"
case "$(uname -m)" in
  x86_64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

# --- Node.js (bundles npm + npx) ---
if [ -x "$BIN_DIR/node" ]; then
  echo "node already present ($("$BIN_DIR/node" --version)), skipping"
else
  case "$OS_RAW" in
    Darwin) NODE_OS="darwin" ;;
    Linux) NODE_OS="linux" ;;
    *) echo "Unsupported OS for Node.js: $OS_RAW" >&2; exit 1 ;;
  esac

  echo "Looking up latest Node.js for ${NODE_OS}-${ARCH}..."
  NODE_FILE="$(curl -fsSL https://nodejs.org/dist/latest/ \
    | grep -oE "node-v[0-9.]+-${NODE_OS}-${ARCH}\.tar\.gz" | head -1)"
  [ -n "$NODE_FILE" ] || { echo "No Node.js build for ${NODE_OS}-${ARCH}" >&2; exit 1; }

  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  echo "Downloading ${NODE_FILE}..."
  curl -fsSL "https://nodejs.org/dist/latest/${NODE_FILE}" -o "$TMP/node.tar.gz"
  curl -fsSL "https://nodejs.org/dist/latest/SHASUMS256.txt" -o "$TMP/sums.txt"

  EXPECTED="$(grep " ${NODE_FILE}\$" "$TMP/sums.txt" | awk '{print $1}')"
  ACTUAL="$(shasum -a 256 "$TMP/node.tar.gz" | awk '{print $1}')"
  [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$ACTUAL" ] || {
    echo "Node.js checksum mismatch! expected=$EXPECTED actual=$ACTUAL" >&2; exit 1; }

  rm -rf "$BIN_DIR/node-dist"; mkdir -p "$BIN_DIR/node-dist"
  tar -xzf "$TMP/node.tar.gz" -C "$BIN_DIR/node-dist" --strip-components=1
  ln -sf node-dist/bin/node "$BIN_DIR/node"
  ln -sf node-dist/bin/npm "$BIN_DIR/npm"
  ln -sf node-dist/bin/npx "$BIN_DIR/npx"
  echo "Installed node $("$BIN_DIR/node" --version) (checksum verified)"
fi

# --- sqlite3 CLI (dev/debug convenience; the app uses the better-sqlite3 npm
# package, not this binary) ---
if [ -x "$BIN_DIR/sqlite3" ]; then
  echo "sqlite3 already present, skipping"
else
  case "$OS_RAW" in
    Darwin) SQLITE_OS="osx" ;;
    Linux) SQLITE_OS="linux" ;;
    *) SQLITE_OS="" ;;
  esac

  if [ -z "$SQLITE_OS" ] || { [ "$SQLITE_OS" = "linux" ] && [ "$ARCH" = "arm64" ]; }; then
    echo "No sqlite3 CLI build for ${OS_RAW}-${ARCH}; skipping (not required to run the app)"
  else
    echo "Looking up latest sqlite3 tools for ${SQLITE_OS}-${ARCH}..."
    REL_URL="$(curl -fsSL https://www.sqlite.org/download.html \
      | grep -oE "20[0-9]{2}/sqlite-tools-${SQLITE_OS}-${ARCH}-[0-9]+\.zip" | head -1)"

    if [ -z "$REL_URL" ]; then
      echo "No sqlite3 tools build for ${SQLITE_OS}-${ARCH}; skipping" >&2
    else
      TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
      echo "Downloading sqlite3 tools (${REL_URL})..."
      curl -fsSL "https://www.sqlite.org/${REL_URL}" -o "$TMP/tools.zip"
      unzip -q "$TMP/tools.zip" -d "$TMP/out"
      SQLITE_BIN="$(find "$TMP/out" -name sqlite3 -type f | head -1)"
      if [ -z "$SQLITE_BIN" ]; then
        echo "sqlite3 binary not found in archive; skipping" >&2
      else
        cp "$SQLITE_BIN" "$BIN_DIR/sqlite3"; chmod +x "$BIN_DIR/sqlite3"
        echo "Installed sqlite3 $("$BIN_DIR/sqlite3" --version | awk '{print $1}')"
      fi
    fi
  fi
fi

echo "Installing npm dependencies..."
npm install

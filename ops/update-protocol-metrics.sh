#!/usr/bin/env bash
set -euo pipefail

# Run from repo root
cd "$(dirname "$0")/.."

# Local protocol (from env, with sensible default)
LOCAL="${VOID_PROTOCOL_VERSION:-5}"

# Where the manifest lives (can override via env)
MANIFEST="${VOID_UPDATE_MANIFEST_PATH:-/tmp/update-manifest-v6.json}"

# Textfile collector dir (must be writable by this user)
TFD="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"

TEXTFILE_DIR="$TFD" \
  node ops/update-protocol-diff.mjs "$LOCAL" "$MANIFEST" --write-prom

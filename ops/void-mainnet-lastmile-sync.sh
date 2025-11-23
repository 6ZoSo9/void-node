#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="$HOME/.cache/node-exporter-textfile"
SRC="$CACHE_DIR/void_mainnet_lastmile.prom"
DEST="/var/lib/node_exporter/textfile_collector/void_mainnet_lastmile.prom"

if [ ! -f "$SRC" ]; then
  echo "[lastmile-sync] FATAL: $SRC not found, run ops/void-mainnet-lastmile-export.sh first" >&2
  exit 1
fi

echo "[lastmile-sync] installing $SRC -> $DEST (sudo)"
sudo install -m 0644 "$SRC" "$DEST"

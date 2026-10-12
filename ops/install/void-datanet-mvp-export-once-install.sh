#!/usr/bin/env bash
set -euo pipefail
REPO="${REPO:-$HOME/dev/void-node}"
SRC="$REPO/ops/bin/void-datanet-mvp-export-once"
DST="/usr/local/bin/void-datanet-mvp-export-once"
TS="$(date +%Y%m%d-%H%M%S)"

test -f "$SRC"

if sudo test -f "$DST"; then
  sudo cp -a "$DST" "$DST.bak.$TS"
  echo "[ok] backup: $DST.bak.$TS"
fi

sudo install -m 0755 "$SRC" "$DST"
echo "[ok] installed: $DST"

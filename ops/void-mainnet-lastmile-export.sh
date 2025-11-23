#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://127.0.0.1:4100}"
WINDOW="${WINDOW:-200}"  # blocks to look back; matches old script semantics

if ! command -v jq >/dev/null 2>&1; then
  echo "[lastmile-export] FATAL: jq not found in PATH" >&2
  exit 1
fi

HEAD=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number // 0' 2>/dev/null || echo 0)
if [ -z "$HEAD" ] || [ "$HEAD" = "null" ]; then
  HEAD=0
fi

START=$((HEAD - WINDOW + 1))
if [ "$START" -lt 0 ]; then
  START=0
fi

COUNT=0
LAST_NONEMPTY=-1

if [ "$HEAD" -lt "$START" ]; then
  START="$HEAD"
fi

for N in $(seq "$START" "$HEAD"); do
  RESP=$(curl -fsS "$BASE/dev/blocks/$N/txs/persisted" 2>/dev/null || echo '{"len":0}')
  LEN=$(echo "$RESP" | jq -r '.len // 0' 2>/dev/null || echo 0)
  if [ "$LEN" -gt 0 ]; then
    COUNT=$((COUNT + 1))
    LAST_NONEMPTY="$N"
  fi
done

NONEMPTY_RECENT=0
if [ "$COUNT" -gt 0 ]; then
  NONEMPTY_RECENT=1
fi

TMP=$(mktemp)

{
  echo "# HELP void_mainnet_lastmile_nonempty_recent Mainnet core last-mile health (1=at least one non-empty block in recent window, 0=none)"
  echo "# TYPE void_mainnet_lastmile_nonempty_recent gauge"
  echo "void_mainnet_lastmile_nonempty_recent{chain=\"mainnet-core\"} $NONEMPTY_RECENT"

  echo
  echo "# HELP void_mainnet_lastmile_nonempty_count_recent Number of non-empty blocks in the recent window"
  echo "# TYPE void_mainnet_lastmile_nonempty_count_recent gauge"
  echo "void_mainnet_lastmile_nonempty_count_recent{chain=\"mainnet-core\"} $COUNT"

  echo
  echo "# HELP void_mainnet_lastmile_window Size of the last-mile window (blocks)"
  echo "# TYPE void_mainnet_lastmile_window gauge"
  echo "void_mainnet_lastmile_window{chain=\"mainnet-core\"} $WINDOW"

  echo
  echo "# HELP void_mainnet_lastmile_head_number Last observed head number on mainnet-core"
  echo "# TYPE void_mainnet_lastmile_head_number gauge"
  echo "void_mainnet_lastmile_head_number{chain=\"mainnet-core\"} $HEAD"

  echo
  echo "# HELP void_mainnet_lastmile_last_nonempty_number Highest block number in window with txs>0 (-1 if none)"
  echo "# TYPE void_mainnet_lastmile_last_nonempty_number gauge"
  echo "void_mainnet_lastmile_last_nonempty_number{chain=\"mainnet-core\"} $LAST_NONEMPTY"
} >"$TMP"

CACHE_DIR="$HOME/.cache/node-exporter-textfile"
mkdir -p "$CACHE_DIR"
OUT_LOCAL="$CACHE_DIR/void_mainnet_lastmile.prom"
mv "$TMP" "$OUT_LOCAL"

if [ -d /var/lib/node_exporter/textfile_collector ]; then
  install -m 0644 "$OUT_LOCAL" /var/lib/node_exporter/textfile_collector/void_mainnet_lastmile.prom 2>/dev/null || true
fi

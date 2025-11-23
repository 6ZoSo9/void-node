#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
BASE="${BASE:-http://127.0.0.1:4100}"
WINDOW="${WINDOW:-10}"

# User-level textfile location (always writable by you)
USER_DIR="${USER_TEXTFILE_DIR:-$HOME/.cache/node-exporter-textfile}"
PROM_USER_TEXTFILE="${PROM_USER_TEXTFILE:-$USER_DIR/void_mainnet_lastmile.prom}"

# Root-level textfile location (used by node_exporter; might not be writable)
PROM_ROOT_TEXTFILE="${PROM_ROOT_TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_mainnet_lastmile.prom}"

mkdir -p "$USER_DIR"
cd "$REPO"

if ! command -v jq >/dev/null 2>&1; then
  echo "[lastmile-export] ERROR: jq not found in PATH" >&2
  exit 1
fi

HEAD_JSON="$(curl -fsS "$BASE/blocks/latest/number2.json")" || {
  echo "[lastmile-export] ERROR: failed to fetch /blocks/latest/number2.json" >&2
  exit 1
}

HEAD="$(jq -r '.number' <<<"$HEAD_JSON" 2>/dev/null || echo "null")"
if [[ -z "$HEAD" || "$HEAD" == "null" ]]; then
  echo "[lastmile-export] ERROR: could not parse head number" >&2
  exit 1
fi

if ! [[ "$HEAD" =~ ^[0-9]+$ ]]; then
  echo "[lastmile-export] ERROR: head is not numeric: $HEAD" >&2
  exit 1
fi

if [[ "$WINDOW" -lt 1 ]]; then
  WINDOW=1
fi

START=$(( HEAD - WINDOW + 1 ))
if [[ "$START" -lt 0 ]]; then
  START=0
fi

NONEMPTY=0
LAST_NONEMPTY=-1

for (( n=START; n<=HEAD; n++ )); do
  JSON="$(curl -fsS "$BASE/dev/blocks/$n/txs/persisted" 2>/dev/null || echo '{}')"
  LEN="$(jq -r '.len // 0' <<<"$JSON" 2>/dev/null || echo 0)"

  if [[ "$LEN" =~ ^[0-9]+$ ]] && [[ "$LEN" -gt 0 ]]; then
    NONEMPTY=$(( NONEMPTY + 1 ))
    LAST_NONEMPTY="$n"
  fi
done

if [[ "$NONEMPTY" -gt 0 ]]; then
  RECENT=1
else
  RECENT=0
fi

TS_MS="$(($(date +%s%N)/1000000))"

TMP="$(mktemp)"
{
  echo "# HELP void_mainnet_lastmile_nonempty_recent Mainnet core last-mile health (1=at least one non-empty block in recent window, 0=none)"
  echo "# TYPE void_mainnet_lastmile_nonempty_recent gauge"
  echo "void_mainnet_lastmile_nonempty_recent{chain=\"mainnet-core\"} $RECENT"
  echo
  echo "# HELP void_mainnet_lastmile_nonempty_count_recent Number of non-empty blocks in the recent window"
  echo "# TYPE void_mainnet_lastmile_nonempty_count_recent gauge"
  echo "void_mainnet_lastmile_nonempty_count_recent{chain=\"mainnet-core\"} $NONEMPTY"
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
  echo
  echo "# HELP void_mainnet_lastmile_export_ts_ms Export timestamp for last-mile window exporter"
  echo "# TYPE void_mainnet_lastmile_export_ts_ms gauge"
  echo "void_mainnet_lastmile_export_ts_ms{chain=\"mainnet-core\"} $TS_MS"
} >"$TMP"

mv "$TMP" "$PROM_USER_TEXTFILE"

ROOT_DIR="$(dirname "$PROM_ROOT_TEXTFILE")"
if [[ -d "$ROOT_DIR" && -w "$ROOT_DIR" ]]; then
  cp "$PROM_USER_TEXTFILE" "$PROM_ROOT_TEXTFILE"
  echo "[lastmile-export] installed to $PROM_ROOT_TEXTFILE"
else
  echo "[lastmile-export] NOTE: cannot write $PROM_ROOT_TEXTFILE (permission denied); user copy only at $PROM_USER_TEXTFILE"
fi

echo "[lastmile-export] HEAD=$HEAD WINDOW=$WINDOW NONEMPTY=$NONEMPTY LAST_NONEMPTY=$LAST_NONEMPTY"
echo "[lastmile-export] wrote $PROM_USER_TEXTFILE"

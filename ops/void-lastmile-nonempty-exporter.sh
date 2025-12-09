#!/usr/bin/env bash
set -euo pipefail

# last-mile non-empty block exporter
# Emits gauges into node_exporter textfile dir.

REPO_ROOT="${REPO_ROOT:-/home/zoso/dev/void-node}"
OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_FILE="${OUT_DIR}/void_lastmile_nonempty.prom"

BASE="${BASE:-http://127.0.0.1:4100}"
WINDOW="${WINDOW:-50}"   # how many recent blocks to inspect

TMP="$(mktemp "${OUT_FILE}.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

curl_bin="$(command -v curl || true)"
jq_bin="$(command -v jq || true)"

if [ -z "$curl_bin" ] || [ -z "$jq_bin" ]; then
  echo "# void_lastmile_nonempty exporter: missing curl or jq" > "$TMP"
  mv "$TMP" "$OUT_FILE"
  exit 0
fi

HEAD_JSON="$("$curl_bin" -fsS "${BASE}/blocks/latest/number2.json" || echo '{}')"
HEAD="$(
  echo "$HEAD_JSON" | "$jq_bin" -r '.number // -1' 2>/dev/null || echo -1
)"

if ! [[ "$HEAD" =~ ^[0-9]+$ ]]; then
  HEAD=-1
fi

if [ "$HEAD" -lt 0 ]; then
  {
    echo "# void_lastmile_nonempty exporter: bad head"
    echo "void_lastmile_head_number -1"
    echo "void_lastmile_checked_blocks_total 0"
    echo "void_lastmile_nonempty_blocks_total 0"
    echo "void_lastmile_nonempty_ratio 0"
    echo "void_lastmile_last_nonempty_number -1"
    echo "void_lastmile_last_nonempty_gap -1"
  } > "$TMP"
  mv "$TMP" "$OUT_FILE"
  exit 0
fi

START=$((HEAD - WINDOW + 1))
if [ "$START" -lt 0 ]; then START=0; fi

checked=0
nonempty=0
last_nonempty=-1

for n in $(seq "$START" "$HEAD"); do
  # Fetch persisted txs for block n
  JSON="$("$curl_bin" -fsS "${BASE}/dev/blocks/${n}/txs/persisted" 2>/dev/null || echo '{}')"
  LEN="$(
    echo "$JSON" | "$jq_bin" -r '.txs | length // 0' 2>/dev/null || echo 0
  )"

  if ! [[ "$LEN" =~ ^[0-9]+$ ]]; then
    LEN=0
  fi

  checked=$((checked + 1))
  if [ "$LEN" -gt 0 ]; then
    nonempty=$((nonempty + 1))
    last_nonempty="$n"
  fi
done

if [ "$checked" -le 0 ]; then
  ratio=0
else
  # ratio as float
  ratio="$(awk -v n="$nonempty" -v c="$checked" 'BEGIN { if (c<=0) print 0; else printf "%.6f", n/c }')"
fi

if [ "$last_nonempty" -ge 0 ]; then
  gap=$((HEAD - last_nonempty))
else
  gap=-1
fi

{
  echo "# HELP void_lastmile_head_number Latest block number on main proposer"
  echo "# TYPE void_lastmile_head_number gauge"
  echo "void_lastmile_head_number ${HEAD}"

  echo "# HELP void_lastmile_checked_blocks_total Number of blocks scanned by lastmile exporter"
  echo "# TYPE void_lastmile_checked_blocks_total gauge"
  echo "void_lastmile_checked_blocks_total ${checked}"

  echo "# HELP void_lastmile_nonempty_blocks_total Number of non-empty blocks in the scan window"
  echo "# TYPE void_lastmile_nonempty_blocks_total gauge"
  echo "void_lastmile_nonempty_blocks_total ${nonempty}"

  echo "# HELP void_lastmile_nonempty_ratio Ratio of non-empty blocks in the scan window"
  echo "# TYPE void_lastmile_nonempty_ratio gauge"
  echo "void_lastmile_nonempty_ratio ${ratio}"

  echo "# HELP void_lastmile_last_nonempty_number Last block number with at least one tx"
  echo "# TYPE void_lastmile_last_nonempty_number gauge"
  echo "void_lastmile_last_nonempty_number ${last_nonempty}"

  echo "# HELP void_lastmile_last_nonempty_gap Head minus last_nonempty_number (blocks)"
  echo "# TYPE void_lastmile_last_nonempty_gap gauge"
  echo "void_lastmile_last_nonempty_gap ${gap}"
} > "$TMP"

mv "$TMP" "$OUT_FILE"

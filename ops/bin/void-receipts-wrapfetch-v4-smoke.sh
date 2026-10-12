#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
RFILE="${RFILE:-$HOME/dev/void-node/data_a/datanet/receipts/datanet.jsonl}"
WHO="${WHO:-dupcheck-v4-smoke-$(date +%Y%m%d-%H%M%S)}"

[ -r "$RFILE" ] || { echo "[fail] missing receipts file: $RFILE"; exit 1; }

# last fetch id: grep-only (no jq/rg)
last_id="$(
  tail -n 400 "$RFILE" \
  | grep -F '"op":"datanet_mvp_fetch"' \
  | tail -n 1 \
  | sed -n 's/.*"id":"\([0-9a-f]\{16,64\}\)".*/\1/p' \
  | head -n 1
)"
if [ -z "${last_id:-}" ]; then
  echo "[skip] no recent fetch id found in last 400 receipt lines"
  exit 0
fi

before_lines="$(wc -l < "$RFILE" | awk '{print $1}')"
echo "file=$RFILE"
echo "who=$WHO"
echo "last_id=$last_id"
echo "before_lines=$before_lines"

url="$BASE/datanet/v1/fetch/$last_id?who=$WHO"
echo "[try] $url"

# hard timeout + discard body
hdr="$(mktemp)"
trap 'rm -f "$hdr" 2>/dev/null || true' EXIT
curl -sS --max-time 2 --connect-timeout 1 -D "$hdr" -o /dev/null "$url" || true

# check HTTP status quickly
status="$(head -n 1 "$hdr" | awk '{print $2}' || true)"
echo "http_status=${status:-<empty>}"

after_lines="$(wc -l < "$RFILE" | awk '{print $1}')"
delta=$((after_lines - before_lines))
echo "after_lines=$after_lines"
echo "delta_lines=$delta"

# show up to 3 matches for WHO in tail (expect 1)
who_count="$(tail -n 200 "$RFILE" | grep -F "\"who\":\"$WHO\"" | wc -l | awk '{print $1}')"
echo "who_count_in_tail=$who_count"
tail -n 12 "$RFILE" | grep -F "\"who\":\"$WHO\"" | head -n 3 || true

if [ "$delta" -eq 1 ] && [ "$who_count" -eq 1 ]; then
  echo "[ok] receipts append exactly one line for this fetch"
elif [ "$delta" -eq 0 ] && [ "$who_count" -eq 0 ]; then
  echo "[warn] no receipt appended (either wrapper not mounted or receipts path changed)"
else
  echo "[warn] unexpected: delta=$delta who_count=$who_count"
fi

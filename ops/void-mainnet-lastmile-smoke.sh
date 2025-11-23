#!/usr/bin/env bash
set -euo pipefail

# Simple last-mile smoke:
#  - hit /health
#  - accept 3 marker txs into HTTP node mempool
#  - wait a few seconds
#  - show last 5 persisted blocks and their tx counts

BASE="${BASE:-http://127.0.0.1:4100}"

cd "$(dirname "$0")/.."

echo "=== [lastmile: health + head before] ==="
curl -fsS "$BASE/health" | jq .
curl -fsS "$BASE/blocks/latest/number2.json" | jq .

echo
echo "=== [lastmile: accept 3 marker txs] ==="
for i in 1 2 3; do
  DATA_HEX=$(printf 'feedLM%03x' "$i")
  PAYLOAD=$(jq -n --arg d "0x$DATA_HEX" '{ data: $d }')
  echo "--- /__void/dev/tx/accept #$i data=0x$DATA_HEX"
  curl -fsS -X POST "$BASE/__void/dev/tx/accept" \
    -H 'content-type: application/json' \
    -d "$PAYLOAD" | jq .
done

echo
echo "=== [lastmile: mempool inspect after accepts] ==="
curl -fsS "$BASE/__void/dev/mempool/inspect" | jq .

echo
echo "=== [lastmile: wait 6s, then inspect last 5 blocks persisted txs] ==="
sleep 6
HEAD=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')
echo "HEAD = $HEAD"

HAS_NONEMPTY=0
for n in $(seq $((HEAD-4)) "$HEAD"); do
  echo "--- dev/blocks/$n/txs/persisted ---"
  OUT=$(curl -fsS "$BASE/dev/blocks/$n/txs/persisted")
  echo "$OUT" | jq .
  LEN=$(echo "$OUT" | jq -r '.len // 0')
  if [ "$LEN" -gt 0 ]; then
    HAS_NONEMPTY=1
  fi
done

echo
if [ "$HAS_NONEMPTY" -eq 1 ]; then
  echo "RESULT: OK (at least one of the last 5 blocks is non-empty; last-mile path is alive)"
else
  echo "RESULT: BAD (all last 5 blocks empty; last-mile path might be broken)"
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:4100"

echo '=== [lastmile: health + head before] ==='
curl -fsS "$BASE/health" | jq .
curl -fsS "$BASE/blocks/latest/number2.json" | jq .
echo

echo '=== [lastmile: accept 3 marker txs] ==='
for i in 1 2 3; do
  # Generate 8 random bytes and turn them into 16 hex chars
  RAND_HEX=$(head -c 8 /dev/urandom | hexdump -v -e '/1 "%02x"')
  # Keep a recognizable prefix but ensure the tail is hex-only
  DATA_HEX="feedlm${RAND_HEX}"
  PAYLOAD=$(jq -n --arg d "0x$DATA_HEX" '{ data: $d }')
  echo "--- /__void/dev/tx/accept #$i data=0x$DATA_HEX"
  curl -fsS -X POST "$BASE/__void/dev/tx/accept" \
    -H 'content-type: application/json' \
    -d "$PAYLOAD" | jq .
done

echo
echo '=== [lastmile: mempool inspect after accepts] ==='
curl -fsS "$BASE/__void/dev/mempool/inspect" | jq .
echo

echo '=== [lastmile: wait 6s, then inspect last 5 blocks persisted txs] ==='
sleep 6
HEAD=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')
echo "HEAD = $HEAD"

START=$((HEAD-4))
if [ "$START" -lt 0 ]; then
  START=0
fi

NONEMPTY_COUNT=0
for n in $(seq "$START" "$HEAD"); do
  echo "--- dev/blocks/$n/txs/persisted ---"
  RESP=$(curl -fsS "$BASE/dev/blocks/$n/txs/persisted")
  echo "$RESP" | jq .
  LEN=$(echo "$RESP" | jq -r '.len // 0')
  if [ "$LEN" -gt 0 ]; then
    NONEMPTY_COUNT=$((NONEMPTY_COUNT+1))
  fi
done

echo
if [ "$NONEMPTY_COUNT" -gt 0 ]; then
  echo "RESULT: OK (at least one of the last 5 blocks is non-empty; last-mile path is alive)"
else
  echo "RESULT: WARN (all of the last 5 blocks are empty; check proposer + acceptTx path)"
fi

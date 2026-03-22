#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WAIT_SECS="${WAIT_SECS:-5}"
cd "${ROOT:-$HOME/dev/void-node}"

echo "=== main smoke: baseline ==="
H0="$(curl -fsS --max-time 3 "$BASE/head.txt")"
echo "head_before=$H0"

TS="$(date +%Y%m%d-%H%M%S)"
MEMO="demo-smoke-$TS"

echo
echo "=== main smoke: submit tx ==="
RESP="$(curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  -X POST "$BASE/tx/submit" \
  --data '{"from":"devA","to":"devB","amount":1,"memo":"'"$MEMO"'"}')"
echo "$RESP"

echo
echo "=== main smoke: wait ==="
sleep "$WAIT_SECS"

H1="$(curl -fsS --max-time 3 "$BASE/head.txt")"
echo "head_after=$H1"

if [ "$H1" -le "$H0" ]; then
  echo "FAIL head did not advance"
  exit 1
fi

echo
echo "=== main smoke: persisted search window ==="
FROM="$H0"
TO="$H1"
FOUND=0
FOUND_BLOCK=""
i="$FROM"
while [ "$i" -le "$TO" ]; do
  PERSISTED="$(curl -fsS --max-time 5 "$BASE/blocks/$i/persisted" || true)"
  echo "$PERSISTED"
  echo
  if printf '%s' "$PERSISTED" | grep -F "\"memo\":\"$MEMO\"" >/dev/null 2>&1; then
    FOUND=1
    FOUND_BLOCK="$i"
    break
  fi
  i=$((i + 1))
done

if [ "$FOUND" -ne 1 ]; then
  echo "FAIL persisted block range missing submitted tx memo=$MEMO range=${FROM}..${TO}"
  exit 1
fi

echo "PASS main sealed submitted tx in block $FOUND_BLOCK"

echo
echo "=== main smoke: proposer truth ==="
PSTAT="$(curl -fsS --max-time 5 "$BASE/proposer/status")"
echo "$PSTAT"
echo "$PSTAT" | grep -F '"enabled":true' >/dev/null || {
  echo "FAIL proposer not enabled"
  exit 1
}

echo
echo "=== main smoke: submit path truth ==="
TRUTH="$(curl -fsS --max-time 5 "$BASE/__void/diag/submit_path_truth.json")"
echo "$TRUTH"
echo "$TRUTH" | grep -F '"node_txQueue_size":0' >/dev/null || {
  echo "FAIL live node.txQueue not clean"
  exit 1
}

echo
echo "PASS main sealed submitted tx"

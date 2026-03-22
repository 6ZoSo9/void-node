#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WAIT_SECS="${WAIT_SECS:-5}"
SEARCH_SECS="${SEARCH_SECS:-12}"
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
echo "=== main smoke: initial wait ==="
sleep "$WAIT_SECS"

H1="$(curl -fsS --max-time 3 "$BASE/head.txt")"
echo "head_after=$H1"

if [ "$H1" -le "$H0" ]; then
  echo "FAIL head did not advance"
  exit 1
fi

echo
echo "=== main smoke: persisted moving search window ==="
FOUND=0
FOUND_BLOCK=""
SEEN_FROM="$H0"
DEADLINE=$(( $(date +%s) + SEARCH_SECS ))

while [ "$(date +%s)" -le "$DEADLINE" ]; do
  CUR_HEAD="$(curl -fsS --max-time 3 "$BASE/head.txt" || echo "$H1")"

  if [ -z "${CUR_HEAD:-}" ]; then
    CUR_HEAD="$H1"
  fi

  if [ "$CUR_HEAD" -lt "$SEEN_FROM" ]; then
    sleep 1
    continue
  fi

  i="$SEEN_FROM"
  while [ "$i" -le "$CUR_HEAD" ]; do
    PERSISTED="$(curl -fsS --max-time 5 "$BASE/blocks/$i/persisted" || true)"
    echo "$PERSISTED"
    echo
    if printf '%s' "$PERSISTED" | grep -F "\"memo\":\"$MEMO\"" >/dev/null 2>&1; then
      FOUND=1
      FOUND_BLOCK="$i"
      break 2
    fi
    i=$((i + 1))
  done

  SEEN_FROM=$((CUR_HEAD + 1))
  sleep 1
done

if [ "$FOUND" -ne 1 ]; then
  FINAL_HEAD="$(curl -fsS --max-time 3 "$BASE/head.txt" || echo unknown)"
  echo "=== main smoke: proposer truth on failure ==="
  curl -fsS --max-time 5 "$BASE/proposer/status" || true
  echo
  echo "=== main smoke: submit path truth on failure ==="
  curl -fsS --max-time 5 "$BASE/__void/diag/submit_path_truth.json" || true
  echo
  echo "=== main smoke: mempool truth on failure ==="
  curl -fsS --max-time 5 "$BASE/mempool" || true
  echo
  echo "FAIL persisted block search missing submitted tx memo=$MEMO searched_from=$H0 final_head=$FINAL_HEAD search_secs=$SEARCH_SECS"
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

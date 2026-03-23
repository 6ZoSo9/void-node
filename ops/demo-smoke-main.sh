#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
WAIT_SECS="${WAIT_SECS:-5}"
SEARCH_SECS="${SEARCH_SECS:-12}"

head_now() {
  curl -fsS --max-time 3 "${BASE}/head.txt"
}

echo "=== main smoke: baseline ==="
H0="$(head_now)"
echo "head_before=$H0"

echo
echo "=== main smoke: submit tx ==="
TS="$(date +%Y%m%d-%H%M%S)"
MEMO="demo-smoke-$TS"
curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/tx/submit" \
  --data '{"from":"devA","to":"devB","amount":1,"memo":"'"$MEMO"'"}'
echo

echo "=== main smoke: initial wait ==="
sleep "$WAIT_SECS"

echo
echo "=== main smoke: persisted moving search window ==="
H1="$(head_now)"
echo "head_after=$H1"

if [ "$H1" -le "$H0" ]; then
  echo "FAIL head did not advance"
  exit 1
fi

FOUND=0
FOUND_BLOCK=""
SEEN_FROM="$H0"
DEADLINE=$(( $(date +%s) + SEARCH_SECS ))

while [ "$(date +%s)" -le "$DEADLINE" ]; do
  CUR_HEAD="$(head_now || echo "$H1")"
  [ -n "${CUR_HEAD:-}" ] || CUR_HEAD="$H1"

  if [ "$CUR_HEAD" -lt "$SEEN_FROM" ]; then
    sleep 1
    continue
  fi

  i="$SEEN_FROM"
  while [ "$i" -le "$CUR_HEAD" ]; do
    BODY="$(curl -fsS --max-time 5 "${BASE}/blocks/${i}/persisted" || true)"
    echo "$BODY"
    echo
    if printf '%s' "$BODY" | grep -F "\"memo\":\"$MEMO\"" >/dev/null 2>&1; then
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
  FINAL_HEAD="$(head_now || echo unknown)"
  echo "=== proposer status on failure ==="
  curl -fsS --max-time 5 "${BASE}/proposer/status" || true
  echo
  echo "=== submit path truth on failure ==="
  curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json" || true
  echo
  echo "=== mempool truth on failure ==="
  curl -fsS --max-time 5 "${BASE}/mempool" || true
  echo
  echo "FAIL persisted block search missing submitted tx memo=$MEMO searched_from=$H0 final_head=$FINAL_HEAD search_secs=$SEARCH_SECS"
  exit 1
fi

echo "PASS main sealed submitted tx in block $FOUND_BLOCK"
echo
echo "=== main smoke: proposer truth ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo
echo
echo "=== main smoke: submit path truth ==="
curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json"
echo

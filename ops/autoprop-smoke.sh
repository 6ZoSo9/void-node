#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WAIT_SECS="${WAIT_SECS:-6}"
SEARCH_SECS="${SEARCH_SECS:-30}"

head_now() {
  local n
  n="$(curl -fsS --max-time 3 "${BASE}/blocks/latest/number2.json" 2>/dev/null | python3 -c 'import sys,json; print(int(json.load(sys.stdin).get("number",0)))' 2>/dev/null || true)"
  if [ -n "${n:-}" ] && [ "$n" -gt 0 ] 2>/dev/null; then
    printf '%s\n' "$n"
    return 0
  fi
  curl -fsS --max-time 3 "${BASE}/head.txt"
}

block_hits_memo() {
  local n="$1"
  local memo="$2"
  local body=""

  for u in \
    "${BASE}/blocks/${n}/persisted" \
    "${BASE}/blocks/${n}/full2" \
    "${BASE}/blocks/range?start=${n}&end=${n}" \
    "${BASE}/blocks/${n}/full"
  do
    body="$(curl -fsS --max-time 5 "$u" || true)"
    echo "$body"
    echo
    if printf '%s' "$body" | grep -F "\"memo\":\"$memo\"" >/dev/null 2>&1; then
      return 0
    fi
  done

  return 1
}

echo "=== baseline ==="
H0="$(head_now)"
echo "head_before=$H0"

echo "=== submit one tx ==="
TS="$(date +%Y%m%d-%H%M%S)"
MEMO="autoprop-smoke-$TS"
curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/tx/submit" \
  --data '{"from":"devA","to":"devB","amount":1,"memo":"'"$MEMO"'"}'
echo

echo "=== wait ==="
sleep "$WAIT_SECS"

echo "=== head after ==="
H1="$(head_now)"
echo "head_after=$H1"

if [ "$H1" -le "$H0" ]; then
  echo "FAIL head did not advance"
  exit 1
fi

echo "=== moving search window across proof surfaces ==="
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
    if block_hits_memo "$i" "$MEMO"; then
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
  FINAL_HEAD="$(head_now || echo 0)"

  echo "=== trailing final scan before failure ==="
  START=$(( FINAL_HEAD > 8 ? FINAL_HEAD - 8 : 0 ))
  i="$START"
  while [ "$i" -le "$FINAL_HEAD" ]; do
    if block_hits_memo "$i" "$MEMO"; then
      FOUND=1
      FOUND_BLOCK="$i"
      break
    fi
    i=$((i + 1))
  done

  if [ "$FOUND" -eq 1 ]; then
    echo "[ok] submitted tx found in trailing scan block $FOUND_BLOCK"
    echo "=== proposer status ==="
    curl -fsS --max-time 5 "${BASE}/proposer/status"
    echo
    exit 0
  fi

  echo "=== proposer status on failure ==="
  curl -fsS --max-time 5 "${BASE}/proposer/status" || true
  echo
  echo "=== submit path truth on failure ==="
  curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json" || true
  echo
  echo "=== mempool truth on failure ==="
  curl -fsS --max-time 5 "${BASE}/mempool" || true
  echo
  echo "=== latest head block surfaces on failure ==="
  for u in \
    "${BASE}/blocks/${FINAL_HEAD}/persisted" \
    "${BASE}/blocks/${FINAL_HEAD}/full2" \
    "${BASE}/blocks/range?start=${FINAL_HEAD}&end=${FINAL_HEAD}" \
    "${BASE}/blocks/${FINAL_HEAD}/full"
  do
    echo "--- $u"
    curl -fsS --max-time 5 "$u" || true
    echo
  done
  echo "FAIL block search missing submitted tx memo=$MEMO searched_from=$H0 final_head=$FINAL_HEAD wait_secs=$WAIT_SECS search_secs=$SEARCH_SECS"
  exit 1
fi

echo "[ok] submitted tx found in block $FOUND_BLOCK"

echo "=== proposer status ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo

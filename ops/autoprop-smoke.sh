#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"

head_now() {
  curl -fsS --max-time 3 "${BASE}/head.txt"
}

echo "=== baseline ==="
H0="$(head_now)"
echo "head_before=$H0"

echo "=== submit one tx ==="
TS="$(date +%Y%m%d-%H%M%S)"
MEMO="autoprop-smoke-${TS}"
curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/tx/submit" \
  --data '{"from":"devA","to":"devB","amount":1,"memo":"'"$MEMO"'"}'
echo

echo "=== wait ==="
sleep 5

echo "=== head after ==="
H1="$(head_now)"
echo "head_after=$H1"

FROM="$H0"
TO="$H1"
if [ "$TO" -lt "$FROM" ]; then
  echo "FAIL: head moved backwards ($FROM -> $TO)"
  exit 1
fi

echo "=== persisted search window ==="
FOUND=0
FOUND_BLOCK=""
i="$FROM"
while [ "$i" -le "$TO" ]; do
  BODY="$(curl -fsS --max-time 5 "${BASE}/blocks/${i}/persisted" || true)"
  echo "$BODY"
  echo
  if printf '%s' "$BODY" | grep -F "\"memo\":\"$MEMO\"" >/dev/null 2>&1; then
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

echo "[ok] submitted tx found in block $FOUND_BLOCK"

echo "=== proposer status ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo

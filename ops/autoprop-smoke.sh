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
curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/tx/submit" \
  --data '{"from":"devA","to":"devB","amount":1,"memo":"autoprop-smoke-'"$TS"'"}'
echo

echo "=== wait ==="
sleep 5

echo "=== head after ==="
H1="$(head_now)"
echo "head_after=$H1"

echo "=== persisted ==="
curl -fsS --max-time 5 "${BASE}/blocks/${H1}/persisted"
echo

echo "=== proposer status ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo

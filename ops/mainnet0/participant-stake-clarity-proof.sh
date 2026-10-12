#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-stake-clarity-proof.html"

echo "=== Participant Stake/Register clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-stake-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-stake-clarity-ready.json
echo
python3 - /tmp/void-participant-stake-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Stake/Register copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_STAKE_PUBLIC_CLARITY_V1' "$HTML"
grep -q 'Public Registration ≠ Active Validator Admission' "$HTML"
grep -q 'does not add you to the active validator set' "$HTML"
grep -q 'Preview is safe and non-mutating' "$HTML"
grep -q 'does not make this wallet an active validator' "$HTML"
grep -q 'candidate/waiting preview status' "$HTML"
grep -q 'Candidate registration is not active admission' "$HTML"
grep -q 'Public Registration ≠ Active Validator Admission' "$HTML"
grep -q 'capped, epoch-controlled, and operator-governed' "$HTML"
grep -q 'capped, proof-backed operator lanes' "$HTML"
grep -q 'operator-governed Mainnet-0 gates' "$HTML"

echo "[ok] Stake/Register public clarity copy rendered"

echo
echo "=== [4] runtime truth still green ==="
make mainnet0-status-smoke

echo "[ok] Participant Stake/Register clarity proof passed"

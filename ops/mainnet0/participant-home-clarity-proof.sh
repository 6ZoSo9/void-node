#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-home-clarity-proof.html"

echo "=== Participant Home clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-home-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-home-clarity-ready.json
echo

python3 - /tmp/void-participant-home-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Home clarity copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_HOME_START_PUBLIC_CLARITY_V1' "$HTML"
grep -q 'Mainnet-0 preview • not public launch' "$HTML"
grep -q 'Use Manage Wallet first' "$HTML"
grep -q 'guided participant-page request flow' "$HTML"
grep -q 'preview/candidate-first and does not make you an active validator' "$HTML"
grep -q 'Advanced/operator details stay tucked away' "$HTML"

echo "[ok] Home public clarity copy rendered"

echo
echo "=== [4] final path/status stay green ==="
bash ops/mainnet/mainnet0-final-path-proof.sh
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Home clarity proof passed"

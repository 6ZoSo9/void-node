#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Buy VOID hard-stop composite proof ==="
echo "repo=$(pwd)"
echo "base=$BASE"

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] ready before ==="
curl -fsS "$BASE/__void/ready.json"
echo

echo
echo "=== [3] operator fulfillment runbook hard-stop ==="
make buy-void-operator-fulfillment-runbook-proof

echo
echo "=== [4] payment_confirmed does not send VOID ==="
make buy-void-payment-confirmed-no-void-send-proof

echo
echo "=== [5] fulfillment fail-closed ==="
make buy-void-fulfillment-failclosed-proof

echo
echo "=== [6] Base claim rehearsal note ==="
make buy-void-base-claim-rehearsal-note-proof

echo
echo "=== [7] claim-tx fail-closed ==="
make buy-void-claim-tx-failclosed-proof

echo
echo "=== [8] backend readiness read-only/fail-closed ==="
make buy-void-backend-readiness-proof

echo
echo "=== [9] ready after ==="
curl -fsS "$BASE/__void/ready.json" > /tmp/void-buy-hardstop-ready-after.json
cat /tmp/void-buy-hardstop-ready-after.json
echo

python3 - /tmp/void-buy-hardstop-ready-after.json <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY2

echo
echo "[ok] Buy VOID hard-stop composite proof passed"

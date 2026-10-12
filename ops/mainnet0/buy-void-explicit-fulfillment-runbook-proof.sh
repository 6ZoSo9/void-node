#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RUNBOOK="ops/mainnet0/buy-void-explicit-fulfillment-runbook.current.md"
TMP="${TMP:-/tmp/void-buy-void-explicit-fulfillment-runbook-proof}"
mkdir -p "$TMP"

echo "=== Buy VOID explicit fulfillment runbook proof ==="

echo
echo "=== [1] runbook markers ==="
test -f "$RUNBOOK"
grep -q "status: plan_only" "$RUNBOOK"
grep -q "launch_state: public_mainnet0_live" "$RUNBOOK"
grep -q "mutation_allowed_by_this_doc: false" "$RUNBOOK"
grep -q "Payment confirmation must not automatically send VOID" "$RUNBOOK"
grep -q "VOID fulfillment must remain a separate operator step" "$RUNBOOK"
grep -q "missing_void_tx_ref" "$RUNBOOK"
grep -q "Base no-send proof uses a fresh disposable request" "$RUNBOOK"
grep -q "Ethereum no-send proof uses a fresh disposable request" "$RUNBOOK"
grep -q "No void_sent or completed transition may occur from payment confirmation alone" "$RUNBOOK"
grep -q "fc954906" "$RUNBOOK"
grep -q "ckpt-buy-void-ethereum-no-send-refresh-green-20260528-135155" "$RUNBOOK"
echo "[ok] runbook markers present"

echo
echo "=== [2] ready ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready.json"
cat "$TMP/ready.json"
python3 - "$TMP/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] refreshed Ethereum no-send proof ==="
make buy-void-ethereum-payment-confirmed-no-void-send-proof

echo
echo "=== [4] refreshed Base no-send proof ==="
make buy-void-payment-confirmed-no-void-send-proof

echo
echo "=== [5] fulfillment fail-closed proof ==="
make buy-void-fulfillment-failclosed-proof

echo
echo "=== [6] ready after ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-after.json"
cat "$TMP/ready-after.json"
python3 - "$TMP/ready-after.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY

echo
echo "[ok] Buy VOID explicit fulfillment runbook proof passed"

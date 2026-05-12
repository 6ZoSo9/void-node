#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
POLICY="ops/mainnet0/buy-void-fixed-rate-fulfillment-policy.current.md"
WATCH_ID="buywatch_1778589099533_22c953e4"
TX_HASH="0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337"
DELIVERY="0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31"

echo "=== Buy VOID fixed-rate fulfillment policy proof ==="

echo "=== [1] policy markers ==="
test -f "$POLICY"
grep -q "status: locked_policy_plan_only" "$POLICY"
grep -q "1 USDC = 100 VOID" "$POLICY"
grep -q "observed_amount_usdc: 25" "$POLICY"
grep -q "void_amount: 2500" "$POLICY"
grep -q "void_wei: 2500000000000000000000" "$POLICY"
grep -q "$TX_HASH" "$POLICY"
grep -q "$DELIVERY" "$POLICY"
grep -q "Money step remains explicit and last" "$POLICY"
echo "[ok] policy markers present"

echo "=== [2] live payment truth ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > /tmp/void-buy-fixed-rate-watch.json

python3 - /tmp/void-buy-fixed-rate-watch.json "$TX_HASH" "$DELIVERY" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
tx=sys.argv[2]
delivery=sys.argv[3].lower()
w=j.get("watch") or {}

assert j.get("ok") is True, j
assert w.get("expected_chain") == "ethereum", w
assert w.get("expected_asset") == "ethereum_native_usdc", w
assert w.get("payment_ref") == tx, w
assert float(w.get("observed_amount_usdc")) == 25.0, w
assert w.get("observed_amount_match") is True, w
assert w.get("delivery_wallet","").lower() == delivery, w
assert not w.get("void_tx_ref"), w
print("[ok] live payment matches fixed-rate policy and remains unfulfilled")
PY

echo "=== [3] amount calculation ==="
python3 - <<'PY'
usdc = 25
void_per_usdc = 100
void_amount = usdc * void_per_usdc
void_wei = void_amount * 10**18
assert void_amount == 2500
assert void_wei == 2500000000000000000000
print({"void_amount": void_amount, "void_wei": void_wei})
print("[ok] fixed-rate amount calculation correct")
PY

echo "[ok] Buy VOID fixed-rate fulfillment policy proof passed"

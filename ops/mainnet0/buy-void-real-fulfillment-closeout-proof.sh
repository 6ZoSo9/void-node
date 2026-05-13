#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${VOID_RPC:-http://127.0.0.1:8545}"

VOID_TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
DELIVERY="0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31"

WATCH_ID="buywatch_1778589099533_22c953e4"
QUEUE_ID="buyq_1778589099373_e86e1740"

USDC_TX="0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337"
VOID_TX="0x00d0015ed13739fb14300ebfa7681ca61c5fac37451a70b65895f16a92dc8416"
VOID_WEI="2500000000000000000000"

TMP="${TMP:-/tmp/void-buy-void-real-fulfillment-closeout-proof}"
mkdir -p "$TMP"

echo "=== Buy VOID real fulfillment closeout proof ==="

echo
echo "=== [1] ready ==="
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
echo "=== [2] delivery balance ==="
BAL="$(cast call --rpc-url "$RPC" "$VOID_TOKEN" 'balanceOf(address)(uint256)' "$DELIVERY")"
echo "$BAL"

python3 - "$BAL" "$VOID_WEI" <<'PY'
import re, sys
bal=int(re.match(r"^\d+", sys.argv[1]).group(0))
want=int(sys.argv[2])
assert bal == want, (bal, want)
print("[ok] delivery wallet has 2500 VOID")
PY

echo
echo "=== [3] watch ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > "$TMP/watch.json"

python3 - "$TMP/watch.json" "$USDC_TX" "$VOID_TX" "$DELIVERY" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
usdc_tx=sys.argv[2]
void_tx=sys.argv[3]
delivery=sys.argv[4].lower()
w=j.get("watch") or {}

assert j.get("ok") is True, j
assert w.get("expected_chain") == "ethereum", w
assert w.get("expected_asset") == "ethereum_native_usdc", w
assert w.get("delivery_wallet","").lower() == delivery, w
assert w.get("watch_status") == "void_sent_recorded", w
assert w.get("payment_ref") == usdc_tx, w
assert float(w.get("observed_amount_usdc")) == 25.0, w
assert w.get("observed_amount_match") is True, w
assert w.get("void_tx_ref") == void_tx, w
print("[ok] watch closeout matches real fulfillment")
PY

echo
echo "=== [4] queue ==="
curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=$QUEUE_ID" > "$TMP/queue.json"

python3 - "$TMP/queue.json" "$USDC_TX" "$VOID_TX" "$DELIVERY" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
usdc_tx=sys.argv[2]
void_tx=sys.argv[3]
delivery=sys.argv[4].lower()
q=j.get("queued") or {}

assert j.get("ok") is True, j
assert q.get("delivery_wallet","").lower() == delivery, q
assert q.get("operator_status") == "void_sent", q
assert q.get("payment_ref") == usdc_tx, q
assert q.get("void_tx_ref") == void_tx, q
print("[ok] queue closeout matches real fulfillment")
PY

echo
echo "[ok] Buy VOID real fulfillment closeout proof passed"

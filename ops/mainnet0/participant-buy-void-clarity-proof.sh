#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-buy-void-clarity-proof.html"
CONFIG="/tmp/void-participant-buy-void-clarity-config.json"
STATUS="/tmp/void-participant-buy-void-clarity-status.json"
SALE="/tmp/void-participant-buy-void-clarity-sale.json"

echo "=== Participant Buy VOID clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-buy-void-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-buy-void-clarity-ready.json
echo

python3 - /tmp/void-participant-buy-void-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Buy VOID safety copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'Guided Base or Ethereum USDC request only' "$HTML"
grep -q 'create a Buy VOID request first' "$HTML"
grep -q 'use a self-custody wallet' "$HTML"
grep -q 'exchange/custodial sends and blind direct deposits are not supported' "$HTML"
grep -q 'payment confirmation is not VOID fulfillment' "$HTML"

echo "[ok] Buy VOID public safety copy rendered"

echo
echo "=== [4] live rail state matches the checkout contract ==="
curl -fsS "$BASE/__void/buy-void/config.json" > "$CONFIG"
curl -fsS "$BASE/__void/buy-void/status.json" > "$STATUS"
curl -fsS "$BASE/__void/buy-void/sale-state.json" > "$SALE"

python3 - "$CONFIG" "$STATUS" "$SALE" <<'PY'
import json, sys

config=json.load(open(sys.argv[1]))
status=json.load(open(sys.argv[2]))
sale=json.load(open(sys.argv[3]))

assert config.get("marker") == "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1", config
assert config.get("schema") == "void_public_buy_void_config_v1", config
assert status.get("schema") == "void_public_buy_void_status_v1", status
assert status.get("ok") is True, status
assert sale.get("schema") == "void_buy_void_sale_state_v1", sale
assert sale.get("ok") is True, sale
assert isinstance(config.get("requests_enabled"), bool), config
assert isinstance(config.get("ethereum_requests_enabled"), bool), config
assert isinstance(config.get("payment_ready"), bool), config
assert isinstance(status.get("request_intake_ready"), bool), status
assert isinstance(sale.get("sold_out"), bool), sale

if status["request_intake_ready"]:
    assert config["requests_enabled"] is True, (config, status)
    assert config["payment_ready"] is True, (config, status)

remaining = sale.get("remaining_void")
assert isinstance(remaining, (int, float)) and not isinstance(remaining, bool), sale
assert remaining >= 0, sale

open_now = (
    status["request_intake_ready"]
    and not sale["sold_out"]
    and remaining > 0
)
if not open_now:
    rail_state = "hold"
elif config["ethereum_requests_enabled"]:
    rail_state = "base_and_ethereum_open"
else:
    rail_state = "base_open_ethereum_hold"

print(f"live_buy_rail_state={rail_state}")
print(f"live_requests_enabled={str(config['requests_enabled']).lower()}")
print(f"live_ethereum_requests_enabled={str(config['ethereum_requests_enabled']).lower()}")
print(f"live_request_intake_ready={str(status['request_intake_ready']).lower()}")
PY

node scripts/prove_void_app_buy_presale_readonly_v1.mjs
echo "[ok] live rail state + participant rendering contract"

echo
echo "=== [5] status smoke stays green ==="
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Buy VOID clarity proof passed"

#!/usr/bin/env bash
set -euo pipefail

echo "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1_PROOF_BEGIN"

src="src/index.ts"
fixture="fixtures/public/buy-void-public-checkout-contract-v1.json"
doc="docs/public/buy-void-public-checkout-contract-v1.md"
accounting="ops/public/buy-void-public-checkout-contract-v1-runtime-proof.sh"

for file in "$src" "$fixture" "$doc" "$accounting"; do test -f "$file"; done

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1"
receiver="0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5"
base_usdc="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
proof_sha="dbb0334f7ab01ed11b8200c36d4d94cfc5879032119b530b3709e4b240967830"

for value in "$marker" "$receiver" "$base_usdc" "$proof_sha"; do
  need "$value" "$src"
  need "$value" "$fixture"
done
need "$marker" "$doc"

need 'app.post("/__void/buy-void/request"' "$src"
need 'app.get("/__void/buy-void/request.json"' "$src"
need 'required_method: "POST"' "$src"
need 'one_active_request_per_void_destination' "$src"
need 'payment_tx_hash_not_allowed_at_request_creation' "$src"
need 'invalid_void_destination_address' "$src"
need 'acknowledgement_required_' "$src"
need 'payment_sender_must_equal_void_destination: true' "$src"
need 'status: "awaiting_payment_tx_hash"' "$src"
need 'send_from: void_destination_address' "$src"
need 'automatic_fulfillment: false' "$src"
need 'wallet_send_by_page: false' "$src"
need 'token_approval_by_page: false' "$src"
need 'fetch("/__void/buy-void/request"' "$src"
need 'method:"POST"' "$src"
need 'VOID_PUBLIC_BUY_VOID_CHECKOUT_FORM_V1' "$src"
need 'VOID_BUY_VOID_REQUEST_FIRST_WARNING_V1' "$src"
need 'legacy_request_get_method_not_allowed_green=true' "$accounting"

bad 'app.get("/__void/buy-void/request.json", async' "$src"
bad 'tx_hash: tx_hash || ""' "$src"

test "$(grep -F 'app.post("/__void/buy-void/request"' "$src" | wc -l)" = "1"
test "$(grep -F 'app.get("/__void/buy-void/request.json"' "$src" | wc -l)" = "1"

python3 - "$src" "$fixture" <<'PY'
import json, pathlib, sys
src=pathlib.Path(sys.argv[1]).read_text()
j=json.loads(pathlib.Path(sys.argv[2]).read_text())

def block(a,b):
    x=src.index(a); y=src.index(b,x); return src[x:y]

config=block("// VOID_PUBLIC_BUY_VOID_REQUEST_INTAKE_V1","// VOID_BUY_VOID_POOL_ACCOUNTING_V1")
request=block('    app.get("/__void/buy-void/config.json"',"    // VOID_PUBLIC_BUY_VOID_ROUTE_V1")
page=block('    app.get("/buy-void"',"    // VOID_PUBLIC_FUNDING_USDC_VOID_V1")
pool=block("// VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1","function __voidUsdcVoidBuyPoolHtmlEscapeV1")

receiver="0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5"
usdc="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

assert receiver in config and receiver in pool
assert usdc in config and usdc in pool
assert "__VOID_BUY_VOID_PUBLIC_CHECKOUT_BASE_CHAIN_ID_V1 = 8453" in config
assert "__VOID_BUY_VOID_PUBLIC_CHECKOUT_DELIVERY_CHAIN_ID_V1 = 2050" in config
assert "receiverBindingConflict" in config
assert 'request_method: "POST"' in config
assert 'tx_hash_at_request_creation_allowed: false' in config

assert 'app.post("/__void/buy-void/request"' in request
assert "res.status(405)" in request
assert 'source_chain !== "base"' in request
assert "one_active_request_per_void_destination" in request
assert "payment_tx_hash_not_allowed_at_request_creation" in request
assert "send_from: void_destination_address" in request
assert "automatic_fulfillment: false" in request

assert "Buy VOID with Base USDC" in page
assert "Native VOID destination address (chain ID 2050)" in page
assert 'fetch("/__void/buy-void/request"' in page
assert 'method:"POST"' in page
assert "Payment tx hash" not in page

assert 'accepted_chain: "base"' in pool
assert "accepted_chain_id: 8453" in pool
assert "delivery_chain_id: 2050" in pool
assert 'public_request_method: "POST"' in pool
assert "no_auto_fulfillment: true" in pool
assert "no_wallet_send: true" in pool
assert "no_token_approval: true" in pool
assert "exchange_send_warning" in pool

assert j["marker"]=="VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1"
assert j["payment"]["chain_id"]==8453
assert j["payment"]["token_contract"]==usdc
assert j["payment"]["receiver"]==receiver
assert j["delivery"]["chain_id"]==2050
assert j["request_contract"]["method"]=="POST"
assert j["request_contract"]["legacy_get_status"]==405
assert j["request_contract"]["one_active_request_per_void_destination"] is True
assert j["request_contract"]["tx_hash_at_creation_allowed"] is False
assert len(j["required_acknowledgements"])==5
for k,v in j["authority"].items():
    if k=="bounded_public_request_write":
        assert v is True
    else:
        assert v is False,(k,v)
print("buy_void_public_checkout_source_semantics_green=true")
print("buy_void_public_checkout_fixture_semantics_green=true")
PY

echo "buy_void_public_checkout_receiver_binding_green=true"
echo "buy_void_public_checkout_base_usdc_only_green=true"
echo "buy_void_public_checkout_void_destination_chain_2050_green=true"
echo "buy_void_public_checkout_request_first_green=true"
echo "buy_void_public_checkout_one_active_request_cap_green=true"
echo "buy_void_public_checkout_fulfillment_authority_false_green=true"
echo "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1_GREEN"

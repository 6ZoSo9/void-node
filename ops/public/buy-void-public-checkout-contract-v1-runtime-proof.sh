#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"

echo "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1_RUNTIME_PROOF_BEGIN"
echo "base=$PUBLIC_SEED_BASE"

curl -fsS --connect-timeout 10 --max-time 30 \
  "$PUBLIC_SEED_BASE/__void/buy-void/config.json" \
  -o /tmp/void-buy-public-checkout-config-v1.json

curl -fsS --connect-timeout 10 --max-time 30 \
  "$PUBLIC_SEED_BASE/__void/buy-void/sale-state.json" \
  -o /tmp/void-buy-public-checkout-sale-state-v1.json

curl -fsS --connect-timeout 10 --max-time 30 \
  "$PUBLIC_SEED_BASE/buy-void" \
  -o /tmp/void-buy-public-checkout-page-v1.html

python3 - <<'PY'
import json

cfg = json.load(open("/tmp/void-buy-public-checkout-config-v1.json"))
sale = json.load(open("/tmp/void-buy-public-checkout-sale-state-v1.json"))

assert cfg.get("marker") == "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1", cfg
assert cfg.get("payment_chain") == "base", cfg
assert cfg.get("payment_chain_id") == 8453, cfg
assert cfg.get("delivery_chain_id") == 2050, cfg
assert cfg.get("usdc_contract", "").lower() == (
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
), cfg
assert cfg.get("receive_address", "").lower() == (
    "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5"
), cfg
assert cfg.get("request_method") == "POST", cfg
assert cfg.get("request_route") == "/__void/buy-void/request", cfg
assert cfg.get("request_before_payment_required") is True, cfg
assert cfg.get("payment_sender_must_equal_void_destination") is True, cfg
assert cfg.get("one_active_request_per_void_destination") is True, cfg
assert cfg.get("automatic_fulfillment") is False, cfg
assert cfg.get("wallet_send_by_page") is False, cfg
assert cfg.get("token_approval_by_page") is False, cfg

assert sale.get("schema") == "void_buy_void_sale_state_v1", sale
assert sale.get("pool_void_total") == 10000000, sale
assert float(sale.get("price_usdc_per_void")) == 0.5, sale
assert sale.get("rate_void_per_usdc") == 2, sale

print("public_checkout_config_green=true")
print("public_checkout_sale_state_green=true")
PY

grep -Fq "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1" \
  /tmp/void-buy-public-checkout-page-v1.html
grep -Fq "Buy VOID with Base USDC" \
  /tmp/void-buy-public-checkout-page-v1.html
grep -Fq "Native VOID destination address (chain ID 2050)" \
  /tmp/void-buy-public-checkout-page-v1.html
grep -Fq "Do not send a blind deposit" \
  /tmp/void-buy-public-checkout-page-v1.html

HTTP_CODE="$(
  curl -sS --connect-timeout 10 --max-time 30 \
    -o /tmp/void-buy-public-checkout-legacy-get-v1.json \
    -w "%{http_code}" \
    "$PUBLIC_SEED_BASE/__void/buy-void/request.json"
)"

test "$HTTP_CODE" = "405"
grep -Fq '"required_method":"POST"' \
  /tmp/void-buy-public-checkout-legacy-get-v1.json
grep -Fq '"/__void/buy-void/request"' \
  /tmp/void-buy-public-checkout-legacy-get-v1.json

echo "legacy_request_get_method_not_allowed_green=true"
echo "public_checkout_page_green=true"
echo "public_checkout_runtime_authority_false_green=true"
echo "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1_RUNTIME_GREEN"

#!/usr/bin/env bash
set -euo pipefail
set +H

BASE="${BASE:-http://127.0.0.1:4100}"
EXPECTED_RECEIVE="${EXPECTED_RECEIVE:-0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5}"

CFG="/tmp/void-buy-runtime-receiver-drift-config.json"
STATUS="/tmp/void-buy-runtime-receiver-drift-status.json"

echo "marker=VOID_BUY_VOID_RUNTIME_RECEIVER_DRIFT_GUARD_V1_PROOF"
echo "base=$BASE"
echo "expected_receive=$EXPECTED_RECEIVE"

curl -fsS "$BASE/__void/buy-void/config.json" > "$CFG"
curl -fsS "$BASE/__void/buy-void/status.json" > "$STATUS"

grep -q '"schema":"void_public_buy_void_config_v1"' "$CFG"
grep -q '"ok":true' "$CFG"
grep -q '"payment_ready":true' "$CFG"
grep -q "\"receive_address\":\"$EXPECTED_RECEIVE\"" "$CFG"
grep -q '"chain":"base"' "$CFG"
grep -q '"usdc_symbol":"USDC"' "$CFG"
grep -q '"requests_enabled":true' "$CFG"
grep -q '"automatic_fulfillment":false' "$CFG"
grep -q '"manual_review_required":true' "$CFG"
grep -q '"no_investment_return_promised":true' "$CFG"
grep -q '"no_automatic_token_delivery_promised":true' "$CFG"
grep -q '"do_not_send_from_exchange":true' "$CFG"

grep -q '"schema":"void_public_buy_void_status_v1"' "$STATUS"
grep -q '"ok":true' "$STATUS"
grep -q '"mode":"guarded_request_only"' "$STATUS"
grep -q '"funding_model":"guarded_usdc_to_void"' "$STATUS"
grep -q '"automatic_fulfillment":false' "$STATUS"
grep -q '"manual_review_required":true' "$STATUS"
grep -q '"private_rpc_public":false' "$STATUS"
grep -q '"submitted_usdc_total":0' "$STATUS"
grep -q '"raised_usdc_so_far":0' "$STATUS"
grep -q '"remaining_void":10000000' "$STATUS"

echo "buy_void_runtime_receiver_drift_guard_receive_address_present=true"
echo "buy_void_runtime_receiver_drift_guard_payment_ready=true"
echo "buy_void_runtime_receiver_drift_guard_request_intake_configured=true"
echo "buy_void_runtime_receiver_drift_guard_non_persistent=true"
echo "buy_void_runtime_receiver_drift_guard_did_not_create_request=true"
echo "buy_void_runtime_receiver_drift_guard_automatic_fulfillment=false"
echo "buy_void_runtime_receiver_drift_guard_manual_review_required=true"
echo "public_mutation=false"
echo "wallet_send=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "VOID_BUY_VOID_RUNTIME_RECEIVER_DRIFT_GUARD_V1_GREEN"

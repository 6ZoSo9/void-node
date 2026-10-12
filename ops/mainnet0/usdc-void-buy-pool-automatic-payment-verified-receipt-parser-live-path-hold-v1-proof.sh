#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-verified-receipt-parser-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-verified-receipt-parser-live-path-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "receipt status must be successful" "$doc" >/dev/null
grep -F "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" "$doc" >/dev/null
grep -F "wrong Transfer topic" "$doc" >/dev/null
grep -F "bridged USDbC" "$doc" >/dev/null
grep -F "automatic payment execution: false" "$doc" >/dev/null
grep -F "parser live execution: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-verified-receipt-parser-live-path-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1", "bad marker");
assert(fixture.scope === "private_verified_receipt_parser_live_path_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.verified_receipt_parser_live_path_enabled === false, "verified parser live path must be disabled");
assert(fixture.status.parser_live_execution_enabled === false, "parser live execution must be disabled");

for (const field of [
  "receipt_status",
  "chain_id",
  "token_contract",
  "transfer_topic",
  "from_address",
  "to_receiver",
  "value_raw",
  "decimals",
  "tx_hash",
  "log_index",
  "duplicate_guard_key"
]) {
  assert(fixture.required_parser_fields.includes(field), `missing parser field ${field}`);
}

assert(fixture.transfer_log_policy.erc20_transfer_topic === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "bad transfer topic");
assert(fixture.transfer_log_policy.receipt_status_must_equal === "success", "receipt must require success");
assert(fixture.transfer_log_policy.value_type === "uint256", "value must be uint256");
assert(fixture.transfer_log_policy.decimals_must_equal === 6, "decimals must equal 6");
assert(fixture.transfer_log_policy.duplicate_guard_key_required === true, "duplicate key must be required");

assert(fixture.chain_scope.ethereum_mainnet_usdc.chain_id === 1, "eth chain must be 1");
assert(fixture.chain_scope.ethereum_mainnet_usdc.token_contract_lowercase === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "bad eth token");
assert(fixture.chain_scope.ethereum_mainnet_usdc.decimals === 6, "bad eth decimals");
assert(fixture.chain_scope.base_mainnet_native_usdc.chain_id === 8453, "base chain must be 8453");
assert(fixture.chain_scope.base_mainnet_native_usdc.token_contract_lowercase === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "bad base token");
assert(fixture.chain_scope.base_mainnet_native_usdc.decimals === 6, "bad base decimals");

for (const rejected of [
  "failed_receipt",
  "missing_receipt",
  "missing_logs",
  "wrong_transfer_topic",
  "wrong_token_contract",
  "wrong_chain_id",
  "wrong_receiver",
  "wrong_decimals",
  "malformed_value",
  "missing_tx_hash",
  "missing_log_index",
  "duplicate_key_derivation_failure",
  "bridged_usdbc"
]) {
  assert(fixture.rejected_parser_states.includes(rejected), `missing rejected parser state ${rejected}`);
}

for (const required of [
  "receipt_status_success_fixture_proof",
  "erc20_transfer_topic_parser_proof",
  "dual_chain_token_contract_parser_proof",
  "private_receiver_match_parser_proof",
  "value_raw_uint256_parser_proof",
  "log_index_tx_hash_parser_proof",
  "duplicate_guard_key_derivation_proof",
  "negative_receipt_fixture_proof",
  "cross_box_receipt_parser_dry_run",
  "final_precision_sync"
]) {
  assert(fixture.required_before_activation.includes(required), `missing ${required}`);
}

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const k of [
  "automatic_payment_execution_enabled",
  "automatic_fulfillment_enabled",
  "parser_live_execution_enabled",
  "duplicate_ledger_write_enabled",
  "fulfillment_record_write_enabled",
  "wallet_signing_enabled",
  "void_transfer_enabled",
  "public_mutation_enabled"
]) {
  assert(fixture.status[k] === false, `status ${k} must be false`);
}
for (const k of [
  "contains_wallet_address",
  "contains_receiver_address",
  "contains_wallet_secret",
  "contains_private_key",
  "contains_seed_phrase",
  "contains_buyer_private_data"
]) {
  assert(fixture.privacy[k] === false, `privacy ${k} must be false`);
}
assert(fixture.privacy.private_packet === true, "must be private");
assert(fixture.privacy.public_route_allowed === false, "public route must be disallowed");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private verified receipt parser marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"parser_live_execution"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"parser_live_execution_enabled"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write_enabled"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in verified receipt parser fixture" >&2
  exit 1
fi

echo "automatic_payment_verified_receipt_parser_live_path_hold_doc_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_fixture_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_private_only_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_required_fields_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_transfer_topic_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_dual_chain_scope_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_reject_states_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_required_before_activation_green=true"
echo "automatic_payment_verified_receipt_parser_live_path_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1_GREEN"

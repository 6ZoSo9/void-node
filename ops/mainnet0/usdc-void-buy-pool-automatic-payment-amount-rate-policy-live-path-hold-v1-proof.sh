#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-amount-rate-policy-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-amount-rate-policy-live-path-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "VOID price: 0.50 USDC per 1 VOID" "$doc" >/dev/null
grep -F "derived rate: 1 USDC buys 2 VOID" "$doc" >/dev/null
grep -F "underpayment must reject" "$doc" >/dev/null
grep -F "overpayment must reject" "$doc" >/dev/null
grep -F "allocation amount must be derived deterministically" "$doc" >/dev/null
grep -F "amount/rate live execution: false" "$doc" >/dev/null
grep -F "allocation claim creation: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-amount-rate-policy-live-path-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1", "bad marker");
assert(fixture.scope === "private_amount_rate_policy_live_path_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.amount_rate_policy_live_path_enabled === false, "amount/rate policy live path must be disabled");
assert(fixture.status.amount_rate_live_execution_enabled === false, "amount/rate live execution must be disabled");

assert(fixture.fixed_rate_policy.asset === "USDC", "asset must be USDC");
assert(fixture.fixed_rate_policy.usdc_decimals === 6, "USDC decimals must be 6");
assert(fixture.fixed_rate_policy.void_price_usdc === "0.50", "VOID price must be 0.50");
assert(fixture.fixed_rate_policy.usdc_per_void_numerator === 50, "bad numerator");
assert(fixture.fixed_rate_policy.usdc_per_void_denominator === 100, "bad denominator");
assert(fixture.fixed_rate_policy.void_per_usdc === "2", "bad derived rate");
assert(fixture.fixed_rate_policy.quote_policy_required === true, "quote policy must be required");

for (const field of [
  "chain_id",
  "token_contract",
  "receiver_key",
  "tx_hash",
  "log_index",
  "value_raw",
  "usdc_decimals",
  "quote_or_payment_intent_key",
  "buyer_identity_binding_key",
  "derived_void_amount"
]) {
  assert(fixture.amount_key_fields.includes(field), `missing amount key field ${field}`);
}

assert(fixture.accepted_chain_scope.ethereum_mainnet_usdc.chain_id === 1, "eth chain must be 1");
assert(fixture.accepted_chain_scope.ethereum_mainnet_usdc.token_contract_lowercase === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "bad eth token");
assert(fixture.accepted_chain_scope.ethereum_mainnet_usdc.decimals === 6, "bad eth decimals");
assert(fixture.accepted_chain_scope.base_mainnet_native_usdc.chain_id === 8453, "base chain must be 8453");
assert(fixture.accepted_chain_scope.base_mainnet_native_usdc.token_contract_lowercase === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "bad base token");
assert(fixture.accepted_chain_scope.base_mainnet_native_usdc.decimals === 6, "bad base decimals");

for (const example of fixture.deterministic_examples) {
  assert(example.policy_result === "eligible_for_next_gate_only", "examples must only proceed to next gate");
}
const one = fixture.deterministic_examples.find(x => x.usdc_value_raw === "1000000");
assert(one && one.derived_void_display === "2.000000", "1 USDC must derive 2 VOID");
const fifty = fixture.deterministic_examples.find(x => x.usdc_value_raw === "50000000");
assert(fifty && fifty.derived_void_display === "100.000000", "50 USDC must derive 100 VOID");

for (const rejected of [
  "zero_amount",
  "malformed_amount",
  "wrong_decimals",
  "missing_quote_key",
  "missing_rate_policy",
  "underpayment",
  "overpayment_without_policy",
  "quote_amount_mismatch",
  "chain_token_receiver_not_verified",
  "duplicate_key_amount_mismatch",
  "allocation_amount_not_deterministic"
]) {
  assert(fixture.rejected_amount_rate_states.includes(rejected), `missing rejected state ${rejected}`);
}

for (const required of [
  "value_raw_uint256_amount_policy_proof",
  "usdc_decimals_six_policy_proof",
  "fixed_rate_half_usdc_per_void_policy_proof",
  "quote_binding_policy_proof",
  "underpayment_rejection_proof",
  "overpayment_rejection_or_policy_proof",
  "deterministic_void_amount_derivation_proof",
  "duplicate_key_amount_binding_proof",
  "cross_box_amount_rate_policy_dry_run",
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
  "amount_rate_live_execution_enabled",
  "duplicate_ledger_write_enabled",
  "fulfillment_record_write_enabled",
  "allocation_claim_creation_enabled",
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
  echo "private amount/rate policy marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"amount_rate_live_execution"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"amount_rate_live_execution_enabled"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write_enabled"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write_enabled"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in amount/rate policy fixture" >&2
  exit 1
fi

echo "automatic_payment_amount_rate_policy_live_path_hold_doc_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_fixture_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_private_only_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_fixed_rate_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_amount_fields_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_dual_chain_scope_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_reject_states_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_required_before_activation_green=true"
echo "automatic_payment_amount_rate_policy_live_path_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1_GREEN"

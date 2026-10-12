#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-duplicate-payment-guard-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-duplicate-payment-guard-live-path-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "tx_hash" "$doc" >/dev/null
grep -F "log_index" "$doc" >/dev/null
grep -F "seen_same_tx_log_rejected" "$doc" >/dev/null
grep -F "automatic payment execution: false" "$doc" >/dev/null
grep -F "automatic fulfillment: false" "$doc" >/dev/null
grep -F "duplicate ledger write: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-duplicate-payment-guard-live-path-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1", "bad marker");
assert(fixture.scope === "private_duplicate_payment_guard_live_path_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.duplicate_guard_live_path_enabled === false, "duplicate guard live path must be disabled");
assert(fixture.status.duplicate_ledger_write_enabled === false, "duplicate ledger write must be disabled");

for (const field of [
  "chain_id",
  "token_contract",
  "tx_hash",
  "log_index",
  "from_address",
  "to_receiver",
  "value_raw",
  "buyer_identity_binding_key",
  "payment_intent_or_quote_key"
]) {
  assert(fixture.duplicate_key_fields.includes(field), `missing duplicate key field ${field}`);
}

for (const [state, policy] of Object.entries(fixture.duplicate_state_policy)) {
  if (state === "unseen_payment_candidate") {
    assert(policy === "eligible_for_next_verification_gate_only", "unseen state must only proceed to next gate");
  } else {
    assert(policy === "reject", `duplicate state ${state} must reject`);
  }
}

assert(fixture.chain_scope.ethereum_mainnet_usdc.chain_id === 1, "eth chain must be 1");
assert(fixture.chain_scope.ethereum_mainnet_usdc.token_contract_lowercase === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "bad eth token");
assert(fixture.chain_scope.base_mainnet_native_usdc.chain_id === 8453, "base chain must be 8453");
assert(fixture.chain_scope.base_mainnet_native_usdc.token_contract_lowercase === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "bad base token");

for (const required of [
  "deterministic_duplicate_key_derivation_proof",
  "append_only_duplicate_ledger_read_proof",
  "duplicate_ledger_write_guard_proof",
  "fulfilled_payment_terminal_state_guard_proof",
  "buyer_identity_mismatch_duplicate_proof",
  "chain_token_receiver_duplicate_scope_proof",
  "rollback_disable_switch_proof",
  "cross_box_duplicate_guard_dry_run",
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
  echo "private duplicate payment guard marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"duplicate_ledger_write_enabled"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in duplicate payment guard fixture" >&2
  exit 1
fi

echo "automatic_payment_duplicate_payment_guard_live_path_hold_doc_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_fixture_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_private_only_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_key_fields_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_reject_states_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_dual_chain_scope_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_required_before_activation_green=true"
echo "automatic_payment_duplicate_payment_guard_live_path_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1_GREEN"

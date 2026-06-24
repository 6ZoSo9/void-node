#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-inventory-reserve-decrement-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-inventory-reserve-decrement-live-path-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "buy pool inventory cap: 10,000,000 VOID" "$doc" >/dev/null
grep -F "remaining inventory must never go below zero" "$doc" >/dev/null
grep -F "oversell is rejected" "$doc" >/dev/null
grep -F "duplicate reserve is rejected" "$doc" >/dev/null
grep -F "inventory reserve write: false" "$doc" >/dev/null
grep -F "inventory decrement write: false" "$doc" >/dev/null
grep -F "sold-out closeout write: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-inventory-reserve-decrement-live-path-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1", "bad marker");
assert(fixture.scope === "private_inventory_reserve_decrement_live_path_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.inventory_reserve_decrement_live_path_enabled === false, "live path must be disabled");
assert(fixture.status.inventory_reserve_write_enabled === false, "reserve write must be disabled");
assert(fixture.status.inventory_decrement_write_enabled === false, "decrement write must be disabled");
assert(fixture.status.sold_out_closeout_write_enabled === false, "sold-out closeout write must be disabled");

assert(fixture.inventory_policy.buy_pool_inventory_cap_void_display === "10000000.000000", "bad inventory cap");
assert(fixture.inventory_policy.reserve_required_before_fulfillment === true, "reserve must be required before fulfillment");
assert(fixture.inventory_policy.decrement_required_after_verified_payment === true, "decrement must be after verified payment");
assert(fixture.inventory_policy.remaining_inventory_must_not_go_below_zero === true, "inventory cannot go below zero");
assert(fixture.inventory_policy.sold_out_closeout_required_at_zero === true, "sold-out closeout must be required at zero");
assert(fixture.inventory_policy.oversell_policy === "reject", "oversell must reject");
assert(fixture.inventory_policy.duplicate_reserve_policy === "reject", "duplicate reserve must reject");

for (const field of [
  "chain_id",
  "token_contract",
  "tx_hash",
  "log_index",
  "buyer_identity_binding_key",
  "quote_or_payment_intent_key",
  "derived_void_amount",
  "reserve_key",
  "inventory_snapshot_key"
]) {
  assert(fixture.inventory_key_fields.includes(field), `missing inventory key field ${field}`);
}

for (const [state, policy] of Object.entries(fixture.reserve_state_policy)) {
  if (state === "eligible_unreserved_payment") {
    assert(policy === "eligible_for_next_gate_only", "eligible state must only proceed to next gate");
  } else {
    assert(policy === "reject", `reserve state ${state} must reject`);
  }
}

const normal = fixture.deterministic_examples.find(x => x.current_inventory_void_display === "10000000.000000");
assert(normal && normal.derived_void_amount === "2.000000", "normal example missing");
assert(normal.remaining_after_reserve === "9999998.000000", "normal remaining mismatch");
assert(normal.policy_result === "eligible_for_next_gate_only", "normal example must only proceed");

const exact = fixture.deterministic_examples.find(x => x.current_inventory_void_display === "100.000000");
assert(exact && exact.remaining_after_reserve === "0.000000", "exact depletion example missing");
assert(exact.policy_result === "eligible_for_next_gate_only_with_sold_out_closeout_required", "exact depletion must require sold-out closeout");

const insufficient = fixture.deterministic_examples.find(x => x.current_inventory_void_display === "50.000000");
assert(insufficient && insufficient.policy_result === "reject_insufficient_inventory", "insufficient inventory example missing");

for (const rejected of [
  "missing_inventory_snapshot",
  "missing_reserve_key",
  "duplicate_reserve_key",
  "duplicate_payment_key",
  "zero_allocation",
  "malformed_allocation",
  "allocation_amount_mismatch",
  "insufficient_inventory",
  "inventory_underflow",
  "sold_out_before_reserve",
  "decrement_without_reserve",
  "fulfillment_without_decrement",
  "sold_out_closeout_without_zero_inventory"
]) {
  assert(fixture.rejected_inventory_states.includes(rejected), `missing rejected inventory state ${rejected}`);
}

for (const required of [
  "inventory_snapshot_read_proof",
  "reserve_key_derivation_proof",
  "duplicate_reserve_rejection_proof",
  "insufficient_inventory_rejection_proof",
  "inventory_underflow_rejection_proof",
  "reserve_before_fulfillment_ordering_proof",
  "decrement_after_verified_payment_ordering_proof",
  "sold_out_closeout_at_zero_proof",
  "cross_box_inventory_reserve_decrement_dry_run",
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
  "inventory_reserve_write_enabled",
  "inventory_decrement_write_enabled",
  "sold_out_closeout_write_enabled",
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
  echo "private inventory reserve/decrement marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"inventory_reserve_write"[[:space:]]*:[[:space:]]*true|"inventory_decrement_write"[[:space:]]*:[[:space:]]*true|"sold_out_closeout_write"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"inventory_reserve_write_enabled"[[:space:]]*:[[:space:]]*true|"inventory_decrement_write_enabled"[[:space:]]*:[[:space:]]*true|"sold_out_closeout_write_enabled"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write_enabled"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in inventory reserve/decrement fixture" >&2
  exit 1
fi

echo "automatic_payment_inventory_reserve_decrement_live_path_hold_doc_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_fixture_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_private_only_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_inventory_cap_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_key_fields_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_reject_states_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_underflow_guard_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_sold_out_closeout_gate_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_required_before_activation_green=true"
echo "automatic_payment_inventory_reserve_decrement_live_path_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1_GREEN"

#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-allocation-claim-creation-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-allocation-claim-creation-live-path-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "claim creation requires verified receipt parser pass" "$doc" >/dev/null
grep -F "claim creation requires inventory reserve/decrement policy pass" "$doc" >/dev/null
grep -F "duplicate claim key must reject" "$doc" >/dev/null
grep -F "claim cannot transfer VOID" "$doc" >/dev/null
grep -F "allocation claim creation: false" "$doc" >/dev/null
grep -F "allocation claim append write: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-allocation-claim-creation-live-path-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1", "bad marker");
assert(fixture.scope === "private_allocation_claim_creation_live_path_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.allocation_claim_creation_live_path_enabled === false, "claim creation live path must be disabled");
assert(fixture.status.allocation_claim_creation_enabled === false, "claim creation must be disabled");
assert(fixture.status.allocation_claim_append_write_enabled === false, "claim append write must be disabled");

const policy = fixture.allocation_claim_policy;
assert(policy.verified_receipt_parser_pass_required === true, "receipt parser pass required");
assert(policy.duplicate_payment_guard_pass_required === true, "duplicate guard pass required");
assert(policy.amount_rate_policy_pass_required === true, "amount/rate pass required");
assert(policy.inventory_reserve_decrement_pass_required === true, "inventory pass required");
assert(policy.append_only_claim_required === true, "append-only claim required");
assert(policy.duplicate_claim_key_policy === "reject", "duplicate claim must reject");
assert(policy.claim_before_reserve_policy === "reject", "claim before reserve must reject");
assert(policy.claim_amount_must_equal_reserved_amount === true, "claim amount must equal reserve");
assert(policy.claim_grants_fulfillment_authority === false, "claim cannot grant fulfillment authority");
assert(policy.claim_grants_wallet_signing_authority === false, "claim cannot grant wallet signing authority");
assert(policy.claim_grants_void_transfer_authority === false, "claim cannot grant VOID transfer authority");

for (const field of [
  "buyer_identity_binding_key",
  "payment_verification_key",
  "duplicate_guard_key",
  "quote_or_payment_intent_key",
  "reserve_key",
  "inventory_snapshot_key",
  "derived_void_amount",
  "allocation_claim_key"
]) {
  assert(fixture.allocation_claim_key_fields.includes(field), `missing claim key field ${field}`);
}

for (const [state, result] of Object.entries(fixture.claim_state_policy)) {
  if (state === "eligible_reserved_payment") {
    assert(result === "eligible_for_operator_review_or_next_gate_only", "eligible state must only proceed");
  } else {
    assert(result === "reject", `state ${state} must reject`);
  }
}

for (const rejected of [
  "missing_buyer_identity_binding",
  "missing_payment_verification_key",
  "missing_duplicate_guard_key",
  "missing_amount_rate_result",
  "missing_reserve_key",
  "missing_inventory_reserve_state",
  "missing_derived_void_amount",
  "claim_amount_mismatch",
  "duplicate_allocation_claim_key",
  "claim_before_reserve",
  "claim_after_failed_payment",
  "claim_after_duplicate_payment",
  "claim_after_insufficient_inventory",
  "claim_with_wallet_authority",
  "claim_with_void_transfer_authority"
]) {
  assert(fixture.rejected_allocation_claim_states.includes(rejected), `missing rejected state ${rejected}`);
}

for (const required of [
  "allocation_claim_key_derivation_proof",
  "append_only_claim_guard_proof",
  "duplicate_claim_rejection_proof",
  "claim_after_reserve_ordering_proof",
  "claim_amount_matches_reserved_amount_proof",
  "failed_payment_claim_rejection_proof",
  "duplicate_payment_claim_rejection_proof",
  "insufficient_inventory_claim_rejection_proof",
  "claim_no_wallet_or_transfer_authority_proof",
  "cross_box_allocation_claim_creation_dry_run",
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
  "allocation_claim_creation_enabled",
  "allocation_claim_append_write_enabled",
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
  echo "private allocation claim marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation"[[:space:]]*:[[:space:]]*true|"allocation_claim_append_write"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation_enabled"[[:space:]]*:[[:space:]]*true|"allocation_claim_append_write_enabled"[[:space:]]*:[[:space:]]*true|"fulfillment_record_write_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in allocation claim fixture" >&2
  exit 1
fi

echo "automatic_payment_allocation_claim_creation_live_path_hold_doc_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_fixture_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_private_only_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_claim_policy_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_key_fields_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_reject_states_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_no_wallet_or_transfer_authority_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_required_before_activation_green=true"
echo "automatic_payment_allocation_claim_creation_live_path_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1_GREEN"

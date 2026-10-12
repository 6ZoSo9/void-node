#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/private/usdc-void-buy-pool-buyer-packet-amount-rate-policy-check-result-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-amount-rate-policy-check-result-hold-v1.json"

need() {
  local pattern="$1"
  local file="$2"
  grep -qF "$pattern" "$file" || {
    echo "missing=${pattern} file=${file}" >&2
    exit 1
  }
}

bad() {
  local pattern="$1"
  local file="$2"
  if grep -qF "$pattern" "$file"; then
    echo "forbidden=${pattern} file=${file}" >&2
    exit 1
  fi
}

bad_json_true() {
  local field="$1"
  local file="$2"
  if grep -Eq "\"${field}\"[[:space:]]*:[[:space:]]*true" "$file"; then
    echo "forbidden_json_field_true=${field} file=${file}" >&2
    exit 1
  fi
}

test -f "$src"
test -f "$doc"
test -f "$fixture"

python3 - "$fixture" <<'PY'
import json, sys

p = sys.argv[1]
with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1"
assert data["status"] == "buyer_packet_amount_rate_policy_check_result_hold_green"

pre = data["prerequisite_state"]
assert pre["chain_token_receiver_allowlist_check_result_hold_required"] is True
assert pre["chain_token_receiver_allowlist_check_recorded_unverified_required"] is True
assert pre["duplicate_payment_guard_not_started"] is True
assert pre["payment_eligibility_not_started"] is True

privacy = data["privacy_boundary"]
assert privacy["private_operator_only"] is True
for key in [
    "public_node_route",
    "public_node_intake",
    "public_submission_endpoint",
    "public_mutation",
    "public_ledger_write",
    "public_contact_collection",
    "raw_rpc_payload_published",
    "secret_material_recorded"
]:
    assert privacy[key] is False, (key, privacy[key])

scope = data["amount_rate_policy_check_scope"]
assert scope["amount_rate_policy_check_result_recording_only"] is True
assert scope["operator_controlled_amount_rate_policy_check_result_allowed"] is True
assert scope["observed_usdc_amount_checked"] is True
assert scope["fixed_rate_policy_checked"] is True
assert scope["computed_void_allocation_recorded"] is True
assert scope["minimum_amount_rule_checked"] is True
assert scope["maximum_amount_rule_checked"] is True
assert scope["decimal_normalization_rule_checked"] is True
assert scope["amount_rate_policy_candidate_unverified_for_payment_eligibility"] is True
for key in [
    "duplicate_payment_guard_decided",
    "buyer_identity_binding_complete",
    "finality_confirmations_complete",
    "payment_verification_complete",
    "payment_eligibility_decision_complete",
    "operator_approval_complete"
]:
    assert scope[key] is False, (key, scope[key])

states = set(data["amount_rate_policy_check_result_hold_states"])
for expected in [
    "draft_hold",
    "blocked_allowlist_check_result_not_ready",
    "blocked_amount_missing",
    "blocked_amount_below_minimum",
    "blocked_amount_above_maximum",
    "amount_rate_policy_check_recorded_unverified",
    "held_for_duplicate_payment_guard_check"
]:
    assert expected in states

record = data["example_amount_rate_policy_check_result_record"]
assert record["source_allowlist_check_result_state"] == "chain_token_receiver_allowlist_check_recorded_unverified"
assert record["amount_rate_policy_check_result_state"] == "amount_rate_policy_check_recorded_unverified"
assert record["field_values_redacted"] is True
assert record["amount_minimum_passed"] is True
assert record["amount_maximum_passed"] is True
assert record["decimal_normalization_passed"] is True
assert record["amount_rate_policy_passed"] is True

allowed_literals = {
    "chain_token_receiver_allowlist_check_recorded_unverified",
    "amount_rate_policy_check_recorded_unverified"
}
for key, value in record.items():
    if key in [
        "field_values_redacted",
        "amount_minimum_passed",
        "amount_maximum_passed",
        "decimal_normalization_passed",
        "amount_rate_policy_passed"
    ]:
        continue
    assert "redacted" in str(value) or value in allowed_literals, (key, value)

not_done = data["not_satisfied_by_amount_rate_policy_check_result_hold"]
for key, value in not_done.items():
    assert value is False, (key, value)

authority = data["authority_state"]
for key, value in authority.items():
    assert value is False, (key, value)

proof = data["proof_expectations"]
assert proof["buyer_packet_amount_rate_policy_check_result_hold_green"] is True
assert proof["private_operator_only_green"] is True
assert proof["amount_rate_policy_check_result_recording_only_green"] is True
assert proof["redacted_fixture_green"] is True
assert proof["no_public_route_green"] is True
assert proof["no_duplicate_guard_decision_green"] is True
assert proof["no_payment_decision_green"] is True
assert proof["no_claim_or_inventory_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_packet_amount_rate_policy_check_result_hold_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1" "$doc"
need "amount/rate policy check result recording only" "$doc"
need "chain_token_receiver_allowlist_check_recorded_unverified" "$doc"
need "amount_rate_policy_check_recorded_unverified" "$doc"
need "observed USDC amount" "$doc"
need "configured fixed rate" "$doc"
need "computed VOID allocation" "$doc"
need "duplicate payment guard decision" "$doc"
need "buyer identity binding" "$doc"
need "finality confirmations" "$doc"
need "payment eligibility decision" "$doc"
need "allocation claim creation" "$doc"
need "inventory reservation" "$doc"
need "wallet action" "$doc"
need "VOID transfer" "$doc"
need "automatic fulfillment" "$doc"
need "no public route is created" "$doc"

echo "buyer_packet_amount_rate_policy_check_result_hold_doc_green=true"

need '"chain_token_receiver_allowlist_check_result_hold_required": true' "$fixture"
need '"chain_token_receiver_allowlist_check_recorded_unverified_required": true' "$fixture"
need '"duplicate_payment_guard_not_started": true' "$fixture"
need '"payment_eligibility_not_started": true' "$fixture"
need '"private_operator_only": true' "$fixture"
need '"amount_rate_policy_check_result_recording_only": true' "$fixture"
need '"operator_controlled_amount_rate_policy_check_result_allowed": true' "$fixture"
need '"observed_usdc_amount_checked": true' "$fixture"
need '"fixed_rate_policy_checked": true' "$fixture"
need '"computed_void_allocation_recorded": true' "$fixture"
need '"amount_rate_policy_candidate_unverified_for_payment_eligibility": true' "$fixture"
need '"duplicate_payment_guard_decided": false' "$fixture"
need '"payment_eligibility_decision_complete": false' "$fixture"
need '"amount_rate_policy_check_recorded_unverified"' "$fixture"
need '"held_for_duplicate_payment_guard_check"' "$fixture"
need '"redacted_placeholder_only"' "$fixture"
need '"operator_authority_active": false' "$fixture"
need '"void_transfer_enabled": false' "$fixture"

echo "buyer_packet_amount_rate_policy_check_result_hold_fixture_green=true"

bad "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1" "$src"
bad "buyer-packet-amount-rate-policy-check-result-hold-v1" "$src"
bad "public-node/usdc-void-buy-pool/buyer-packet-amount-rate-policy-check-result-hold" "$src"

bad_json_true "public_node_route" "$fixture"
bad_json_true "public_node_intake" "$fixture"
bad_json_true "public_submission_endpoint" "$fixture"
bad_json_true "public_mutation" "$fixture"
bad_json_true "public_ledger_write" "$fixture"
bad_json_true "public_contact_collection" "$fixture"
bad_json_true "raw_rpc_payload_published" "$fixture"
bad_json_true "secret_material_recorded" "$fixture"
bad_json_true "duplicate_payment_guard_decided" "$fixture"
bad_json_true "buyer_identity_binding_complete" "$fixture"
bad_json_true "finality_confirmations_complete" "$fixture"
bad_json_true "payment_verification_complete" "$fixture"
bad_json_true "payment_eligibility_decision_complete" "$fixture"
bad_json_true "operator_approval_complete" "$fixture"
bad_json_true "operator_review_complete" "$fixture"
bad_json_true "allocation_claim_creation_complete" "$fixture"
bad_json_true "inventory_reservation_complete" "$fixture"
bad_json_true "operator_authority_active" "$fixture"
bad_json_true "automatic_fulfillment_enabled" "$fixture"
bad_json_true "wallet_fulfillment_enabled" "$fixture"
bad_json_true "claim_creation_enabled" "$fixture"
bad_json_true "inventory_reservation_enabled" "$fixture"
bad_json_true "void_transfer_enabled" "$fixture"

echo "buyer_packet_amount_rate_policy_check_result_hold_no_public_route_green=true"
echo "buyer_packet_amount_rate_policy_check_result_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1_GREEN"

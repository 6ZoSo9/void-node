#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/private/usdc-void-buy-pool-buyer-packet-payment-eligibility-decision-result-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-payment-eligibility-decision-result-hold-v1.json"

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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1"
assert data["status"] == "buyer_packet_payment_eligibility_decision_result_hold_green"

pre = data["prerequisite_state"]
assert pre["finality_confirmations_check_result_hold_required"] is True
assert pre["finality_confirmations_check_recorded_unverified_required"] is True
assert pre["operator_approval_not_started"] is True
assert pre["claim_creation_not_started"] is True

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
    "buyer_contact_details_published",
    "secret_material_recorded"
]:
    assert privacy[key] is False, (key, privacy[key])

scope = data["payment_eligibility_decision_result_scope"]
assert scope["payment_eligibility_decision_result_recording_only"] is True
assert scope["operator_controlled_payment_eligibility_decision_result_allowed"] is True
for key in [
    "finality_confirmations_result_considered",
    "buyer_identity_binding_result_considered",
    "duplicate_payment_guard_result_considered",
    "amount_rate_policy_result_considered",
    "chain_token_receiver_allowlist_result_considered",
    "transfer_log_parse_result_considered",
    "receipt_read_result_considered",
    "payment_eligible_recorded",
    "eligibility_decision_state_recorded",
    "eligibility_reason_codes_recorded",
    "claim_creation_candidate_unverified"
]:
    assert scope[key] is True, (key, scope[key])
for key in [
    "operator_approval_complete",
    "allocation_claim_creation_complete",
    "inventory_reservation_complete",
    "fulfillment_execution_complete"
]:
    assert scope[key] is False, (key, scope[key])

states = set(data["payment_eligibility_decision_result_hold_states"])
for expected in [
    "draft_hold",
    "blocked_finality_confirmations_check_result_not_ready",
    "blocked_required_private_check_result_missing",
    "payment_ineligible_hold",
    "payment_eligibility_decision_recorded_unverified",
    "held_for_operator_review_or_claim_creation_boundary"
]:
    assert expected in states

record = data["example_payment_eligibility_decision_result_record"]
assert record["source_finality_confirmations_check_result_state"] == "finality_confirmations_check_recorded_unverified"
assert record["payment_eligibility_decision_result_state"] == "payment_eligibility_decision_recorded_unverified"
assert record["field_values_redacted"] is True
assert record["payment_eligible"] is True
assert record["claim_creation_candidate"] is True
assert isinstance(record["eligibility_reason_codes"], list)
assert record["eligibility_reason_codes"] == ["redacted_placeholder_only"]

allowed_literals = {
    "finality_confirmations_check_recorded_unverified",
    "payment_eligibility_decision_recorded_unverified"
}
for key, value in record.items():
    if key in ["field_values_redacted", "payment_eligible", "claim_creation_candidate", "eligibility_reason_codes"]:
        continue
    assert "redacted" in str(value) or value in allowed_literals, (key, value)

not_done = data["not_satisfied_by_payment_eligibility_decision_result_hold"]
for key, value in not_done.items():
    assert value is False, (key, value)

authority = data["authority_state"]
for key, value in authority.items():
    assert value is False, (key, value)

proof = data["proof_expectations"]
assert proof["buyer_packet_payment_eligibility_decision_result_hold_green"] is True
assert proof["private_operator_only_green"] is True
assert proof["payment_eligibility_decision_result_recording_only_green"] is True
assert proof["redacted_fixture_green"] is True
assert proof["no_public_route_green"] is True
assert proof["no_operator_approval_green"] is True
assert proof["no_claim_or_inventory_green"] is True
assert proof["no_wallet_or_void_transfer_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_packet_payment_eligibility_decision_result_hold_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1" "$doc"
need "payment eligibility decision result recording only" "$doc"
need "finality_confirmations_check_recorded_unverified" "$doc"
need "payment_eligibility_decision_recorded_unverified" "$doc"
need "payment eligible flag" "$doc"
need "eligibility decision state" "$doc"
need "eligibility reason codes" "$doc"
need "operator approval" "$doc"
need "allocation claim creation" "$doc"
need "inventory reservation" "$doc"
need "wallet action" "$doc"
need "VOID transfer" "$doc"
need "automatic fulfillment" "$doc"
need "no public route is created" "$doc"
need "no buyer contact details are published" "$doc"

echo "buyer_packet_payment_eligibility_decision_result_hold_doc_green=true"

need '"finality_confirmations_check_result_hold_required": true' "$fixture"
need '"finality_confirmations_check_recorded_unverified_required": true' "$fixture"
need '"operator_approval_not_started": true' "$fixture"
need '"claim_creation_not_started": true' "$fixture"
need '"private_operator_only": true' "$fixture"
need '"payment_eligibility_decision_result_recording_only": true' "$fixture"
need '"operator_controlled_payment_eligibility_decision_result_allowed": true' "$fixture"
need '"finality_confirmations_result_considered": true' "$fixture"
need '"buyer_identity_binding_result_considered": true' "$fixture"
need '"duplicate_payment_guard_result_considered": true' "$fixture"
need '"payment_eligible_recorded": true' "$fixture"
need '"eligibility_reason_codes_recorded": true' "$fixture"
need '"claim_creation_candidate_unverified": true' "$fixture"
need '"operator_approval_complete": false' "$fixture"
need '"allocation_claim_creation_complete": false' "$fixture"
need '"inventory_reservation_complete": false' "$fixture"
need '"payment_eligibility_decision_recorded_unverified"' "$fixture"
need '"held_for_operator_review_or_claim_creation_boundary"' "$fixture"
need '"payment_eligible": true' "$fixture"
need '"claim_creation_candidate": true' "$fixture"
need '"redacted_placeholder_only"' "$fixture"
need '"operator_authority_active": false' "$fixture"
need '"void_transfer_enabled": false' "$fixture"

echo "buyer_packet_payment_eligibility_decision_result_hold_fixture_green=true"

bad "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1" "$src"
bad "buyer-packet-payment-eligibility-decision-result-hold-v1" "$src"
bad "public-node/usdc-void-buy-pool/buyer-packet-payment-eligibility-decision-result-hold" "$src"

bad_json_true "public_node_route" "$fixture"
bad_json_true "public_node_intake" "$fixture"
bad_json_true "public_submission_endpoint" "$fixture"
bad_json_true "public_mutation" "$fixture"
bad_json_true "public_ledger_write" "$fixture"
bad_json_true "public_contact_collection" "$fixture"
bad_json_true "raw_rpc_payload_published" "$fixture"
bad_json_true "buyer_contact_details_published" "$fixture"
bad_json_true "secret_material_recorded" "$fixture"
bad_json_true "operator_approval_complete" "$fixture"
bad_json_true "operator_review_complete" "$fixture"
bad_json_true "allocation_claim_creation_complete" "$fixture"
bad_json_true "inventory_reservation_complete" "$fixture"
bad_json_true "wallet_action_complete" "$fixture"
bad_json_true "void_transfer_complete" "$fixture"
bad_json_true "automatic_fulfillment_complete" "$fixture"
bad_json_true "operator_authority_active" "$fixture"
bad_json_true "automatic_fulfillment_enabled" "$fixture"
bad_json_true "wallet_fulfillment_enabled" "$fixture"
bad_json_true "claim_creation_enabled" "$fixture"
bad_json_true "inventory_reservation_enabled" "$fixture"
bad_json_true "void_transfer_enabled" "$fixture"

echo "buyer_packet_payment_eligibility_decision_result_hold_no_public_route_green=true"
echo "buyer_packet_payment_eligibility_decision_result_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1_GREEN"

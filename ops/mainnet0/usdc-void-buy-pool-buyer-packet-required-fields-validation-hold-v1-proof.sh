#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/private/usdc-void-buy-pool-buyer-packet-required-fields-validation-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-required-fields-validation-hold-v1.json"

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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1"
assert data["status"] == "buyer_packet_required_fields_validation_hold_green"

privacy = data["privacy_boundary"]
assert privacy["private_operator_only"] is True
for key in [
    "public_node_route",
    "public_node_intake",
    "public_submission_endpoint",
    "public_mutation",
    "public_ledger_write",
    "public_contact_collection",
    "secret_material_recorded"
]:
    assert privacy[key] is False, (key, privacy[key])

scope = data["validation_scope"]
assert scope["field_presence_only"] is True
assert scope["validates_required_fields_presence"] is True
for key in [
    "verifies_field_truthfulness",
    "verifies_payment",
    "verifies_chain_token_receiver_allowlist",
    "verifies_amount_rate_policy",
    "verifies_duplicate_payment",
    "verifies_buyer_identity",
    "verifies_finality",
    "decides_payment_eligibility"
]:
    assert scope[key] is False, (key, scope[key])

required = data["required_fields"]
for key, value in required.items():
    assert value is True, (key, value)

states = set(data["validation_hold_states"])
for expected in [
    "draft_hold",
    "blocked_missing_chain",
    "blocked_missing_transaction_hash",
    "blocked_missing_usdc_amount",
    "blocked_missing_sending_wallet_address",
    "blocked_missing_receiving_void_wallet_address",
    "blocked_missing_buyer_acknowledgment",
    "required_fields_present_unverified",
    "queued_for_payment_verification_hold"
]:
    assert expected in states

record = data["example_validation_record"]
assert record["source_receipt_hold_state"] == "received_private_packet_unverified"
assert record["validation_state"] == "required_fields_present_unverified"
assert record["field_presence_only"] is True
assert record["field_values_redacted"] is True
assert record["missing_fields"] == []
for key in [
    "chain_present",
    "transaction_hash_present",
    "usdc_amount_present",
    "sending_wallet_address_present",
    "receiving_void_wallet_address_present",
    "buyer_acknowledgment_present"
]:
    assert record[key] is True, (key, record[key])
for key in ["validation_record_id", "receipt_record_id", "operator_id"]:
    assert "redacted" in record[key], (key, record[key])

not_done = data["not_satisfied_by_field_validation"]
for key, value in not_done.items():
    assert value is False, (key, value)

authority = data["authority_state"]
for key, value in authority.items():
    assert value is False, (key, value)

proof = data["proof_expectations"]
assert proof["buyer_packet_required_fields_validation_hold_green"] is True
assert proof["field_presence_only_green"] is True
assert proof["private_operator_only_green"] is True
assert proof["redacted_fixture_green"] is True
assert proof["no_public_route_green"] is True
assert proof["no_payment_decision_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_packet_required_fields_validation_hold_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1" "$doc"
need "field-presence validation only" "$doc"
need "payment verification" "$doc"
need "payment eligibility decision" "$doc"
need "allocation claim creation" "$doc"
need "inventory reservation" "$doc"
need "wallet action" "$doc"
need "VOID transfer" "$doc"
need "automatic fulfillment" "$doc"
need "required_fields_present_unverified" "$doc"
need "no public route is created" "$doc"

echo "buyer_packet_required_fields_validation_hold_doc_green=true"

need '"private_operator_only": true' "$fixture"
need '"field_presence_only": true' "$fixture"
need '"validates_required_fields_presence": true' "$fixture"
need '"verifies_payment": false' "$fixture"
need '"decides_payment_eligibility": false' "$fixture"
need '"chain_required": true' "$fixture"
need '"transaction_hash_required": true' "$fixture"
need '"usdc_amount_required": true' "$fixture"
need '"sending_wallet_address_required": true' "$fixture"
need '"receiving_void_wallet_address_required": true' "$fixture"
need '"buyer_acknowledgment_required": true' "$fixture"
need '"required_fields_present_unverified"' "$fixture"
need '"redacted_placeholder_only"' "$fixture"
need '"payment_verification_complete": false' "$fixture"
need '"payment_eligibility_decision_complete": false' "$fixture"
need '"operator_authority_active": false' "$fixture"
need '"void_transfer_enabled": false' "$fixture"

echo "buyer_packet_required_fields_validation_hold_fixture_green=true"

bad "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1" "$src"
bad "buyer-packet-required-fields-validation-hold-v1" "$src"
bad "public-node/usdc-void-buy-pool/buyer-packet-required-fields-validation-hold" "$src"

bad_json_true "public_node_route" "$fixture"
bad_json_true "public_node_intake" "$fixture"
bad_json_true "public_submission_endpoint" "$fixture"
bad_json_true "public_mutation" "$fixture"
bad_json_true "public_ledger_write" "$fixture"
bad_json_true "public_contact_collection" "$fixture"
bad_json_true "secret_material_recorded" "$fixture"
bad_json_true "verifies_field_truthfulness" "$fixture"
bad_json_true "verifies_payment" "$fixture"
bad_json_true "verifies_chain_token_receiver_allowlist" "$fixture"
bad_json_true "verifies_amount_rate_policy" "$fixture"
bad_json_true "verifies_duplicate_payment" "$fixture"
bad_json_true "verifies_buyer_identity" "$fixture"
bad_json_true "verifies_finality" "$fixture"
bad_json_true "decides_payment_eligibility" "$fixture"
bad_json_true "payment_verification_complete" "$fixture"
bad_json_true "payment_eligibility_decision_complete" "$fixture"
bad_json_true "operator_review_complete" "$fixture"
bad_json_true "operator_authority_active" "$fixture"
bad_json_true "automatic_fulfillment_enabled" "$fixture"
bad_json_true "wallet_fulfillment_enabled" "$fixture"
bad_json_true "claim_creation_enabled" "$fixture"
bad_json_true "inventory_reservation_enabled" "$fixture"
bad_json_true "void_transfer_enabled" "$fixture"

echo "buyer_packet_required_fields_validation_hold_no_public_route_green=true"
echo "buyer_packet_required_fields_validation_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1_GREEN"

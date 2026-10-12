#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/private/usdc-void-buy-pool-buyer-packet-private-intake-receipt-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-private-intake-receipt-hold-v1.json"

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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1"
assert data["status"] == "buyer_packet_private_intake_receipt_hold_green"

privacy = data["privacy_boundary"]
assert privacy["private_operator_only"] is True
for key in [
    "public_node_intake",
    "public_submission_endpoint",
    "public_mutation",
    "public_ledger_write",
    "public_contact_collection",
    "secret_material_recorded",
    "seed_phrase_recorded",
    "private_key_recorded",
    "password_recorded"
]:
    assert privacy[key] is False, (key, privacy[key])

states = set(data["receipt_hold_states"])
for expected in [
    "draft_hold",
    "received_private_packet_unverified",
    "blocked_missing_required_fields",
    "blocked_public_submission_attempt",
    "queued_for_manual_review"
]:
    assert expected in states

record = data["private_receipt_record_shape"]
assert record["source_channel"] == "private_operator_channel"
assert record["receipt_hold_state"] == "received_private_packet_unverified"
assert record["buyer_manual_review_acknowledgment_present"] is True
allowed_private_literals = {
    "private_operator_channel",
    "received_private_packet_unverified"
}

for key, value in record.items():
    if key == "buyer_manual_review_acknowledgment_present":
        continue
    assert "redacted" in str(value) or value in allowed_private_literals, (key, value)

req = data["manual_review_requirements_not_satisfied_by_receipt"]
for key, value in req.items():
    assert value is False, (key, value)

authority = data["authority_state"]
for key, value in authority.items():
    assert value is False, (key, value)

proof = data["proof_expectations"]
assert proof["buyer_packet_private_intake_receipt_hold_green"] is True
assert proof["private_operator_only_green"] is True
assert proof["redacted_fixture_green"] is True
assert proof["no_public_route_green"] is True
assert proof["no_payment_decision_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_packet_private_intake_receipt_hold_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1" "$doc"
need "private/operator-only receipt hold shape" "$doc"
need "public-node intake" "$doc"
need "payment verification" "$doc"
need "payment eligibility approval" "$doc"
need "allocation claim creation" "$doc"
need "inventory reservation" "$doc"
need "VOID transfer" "$doc"
need "automatic fulfillment" "$doc"
need "received_private_packet_unverified" "$doc"
need "never record seed phrases" "$doc"

echo "buyer_packet_private_intake_receipt_hold_doc_green=true"

need '"private_operator_only": true' "$fixture"
need '"public_node_intake": false' "$fixture"
need '"public_submission_endpoint": false' "$fixture"
need '"public_mutation": false' "$fixture"
need '"public_ledger_write": false' "$fixture"
need '"secret_material_recorded": false' "$fixture"
need '"seed_phrase_recorded": false' "$fixture"
need '"private_key_recorded": false' "$fixture"
need '"received_private_packet_unverified"' "$fixture"
need '"redacted_placeholder_only"' "$fixture"
need '"payment_verification_complete": false' "$fixture"
need '"payment_eligibility_decision_complete": false' "$fixture"
need '"operator_authority_active": false' "$fixture"
need '"void_transfer_enabled": false' "$fixture"

echo "buyer_packet_private_intake_receipt_hold_fixture_green=true"

bad "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1" "$src"
bad "buyer-packet-private-intake-receipt-hold-v1" "$src"
bad "public-node/usdc-void-buy-pool/buyer-packet-private-intake-receipt-hold" "$src"

bad_json_true "public_node_intake" "$fixture"
bad_json_true "public_submission_endpoint" "$fixture"
bad_json_true "public_mutation" "$fixture"
bad_json_true "public_ledger_write" "$fixture"
bad_json_true "public_contact_collection" "$fixture"
bad_json_true "secret_material_recorded" "$fixture"
bad_json_true "seed_phrase_recorded" "$fixture"
bad_json_true "private_key_recorded" "$fixture"
bad_json_true "password_recorded" "$fixture"
bad_json_true "payment_verification_complete" "$fixture"
bad_json_true "payment_eligibility_decision_complete" "$fixture"
bad_json_true "operator_review_complete" "$fixture"
bad_json_true "operator_authority_active" "$fixture"
bad_json_true "automatic_fulfillment_enabled" "$fixture"
bad_json_true "wallet_fulfillment_enabled" "$fixture"
bad_json_true "claim_creation_enabled" "$fixture"
bad_json_true "inventory_reservation_enabled" "$fixture"
bad_json_true "void_transfer_enabled" "$fixture"

echo "buyer_packet_private_intake_receipt_hold_no_public_route_green=true"
echo "buyer_packet_private_intake_receipt_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1_GREEN"

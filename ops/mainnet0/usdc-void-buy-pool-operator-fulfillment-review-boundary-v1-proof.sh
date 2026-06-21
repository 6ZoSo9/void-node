#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-operator-fulfillment-review-boundary-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-operator-fulfillment-review-boundary-v1.json"
src="src/index.ts"

test -f "$doc"
test -f "$fixture"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1" "$doc" >/dev/null
grep -F "private_operator_fulfillment_review_boundary_only" "$doc" >/dev/null
grep -F "wallet send command" "$doc" >/dev/null
grep -F "private-key action" "$doc" >/dev/null
grep -F "token delivery transaction" "$doc" >/dev/null
grep -F "public receipt intake endpoint" "$doc" >/dev/null
grep -F "public mutation route" "$doc" >/dev/null
grep -F "public buyer queue" "$doc" >/dev/null
grep -F "automatic receipt acceptance" "$doc" >/dev/null
grep -F "automatic fulfillment" "$doc" >/dev/null
grep -F "guaranteed delivery" "$doc" >/dev/null
grep -F "investment return, yield, or profit promise" "$doc" >/dev/null

grep -F "approved_for_manual_fulfillment_review" "$doc" >/dev/null
grep -F "That state is not fulfillment." "$doc" >/dev/null
grep -F "It does not authorize execution." "$doc" >/dev/null

grep -F "decision_record_exists = true" "$doc" >/dev/null
grep -F "decision_state = approved_for_manual_fulfillment_review" "$doc" >/dev/null
grep -F "decision_record_operator_approved = true" "$doc" >/dev/null
grep -F "duplicate_check_performed = true" "$doc" >/dev/null
grep -F "duplicate_found = false" "$doc" >/dev/null
grep -F "chain_check = passed_base" "$doc" >/dev/null
grep -F "asset_check = passed_usdc" "$doc" >/dev/null
grep -F "receiver_check = passed_configured_receiver" "$doc" >/dev/null
grep -F "sender_wallet_is_receipt_identity = true" "$doc" >/dev/null
grep -F "candidate_void_amount_computed = true" "$doc" >/dev/null
grep -F "pool_capacity_confirmed = true" "$doc" >/dev/null
grep -F "redaction_policy_confirmed = true" "$doc" >/dev/null
grep -F "manual_operator_review_required = true" "$doc" >/dev/null

grep -F "not_ready" "$doc" >/dev/null
grep -F "needs_more_info" "$doc" >/dev/null
grep -F "blocked_duplicate" "$doc" >/dev/null
grep -F "blocked_capacity" "$doc" >/dev/null
grep -F "blocked_sender_identity" "$doc" >/dev/null
grep -F "blocked_delivery_wallet_mismatch" "$doc" >/dev/null
grep -F "ready_for_separate_manual_fulfillment_record" "$doc" >/dev/null
grep -F "No state performs fulfillment." "$doc" >/dev/null

grep -F "candidate_void_amount = amount_usdc / 0.50" "$doc" >/dev/null
grep -F "candidate_void_amount = amount_usdc * 2" "$doc" >/dev/null
grep -F "This is a review boundary calculation only." "$doc" >/dev/null

grep -F "wallet_send_command_created = false" "$doc" >/dev/null
grep -F "wallet_send_enabled = false" "$doc" >/dev/null
grep -F "private_key_action_enabled = false" "$doc" >/dev/null
grep -F "token_delivery_transaction_created = false" "$doc" >/dev/null
grep -F "automatic_fulfillment_enabled = false" "$doc" >/dev/null
grep -F "automatic_receipt_acceptance_enabled = false" "$doc" >/dev/null
grep -F "public_receipt_intake_endpoint_open = false" "$doc" >/dev/null
grep -F "public_receipt_mutation_enabled = false" "$doc" >/dev/null
grep -F "public_queue_exposed = false" "$doc" >/dev/null
grep -F "fulfillment_promised = false" "$doc" >/dev/null
grep -F "investment_return_promised = false" "$doc" >/dev/null
grep -F "route_added = false" "$doc" >/dev/null
grep -F "src_index_modified = false" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

fixture = Path("fixtures/private/usdc-void-buy-pool-operator-fulfillment-review-boundary-v1.json")
data = json.loads(fixture.read_text())

required_top = [
    "record_type",
    "marker",
    "schema_version",
    "status",
    "fixture_only",
    "contains_real_buyer_data",
    "created_at_utc",
    "operator_id",
    "source_decision_record",
    "required_preconditions",
    "receipt_reference",
    "fulfillment_review_boundary_state",
    "allowed_fulfillment_review_boundary_states",
    "sender_delivery_wallet_boundary",
    "calculation",
    "pool_capacity_boundary",
    "redaction_policy",
    "next_allowed_step",
    "operator_attestation",
    "safety_flags",
]
missing = [k for k in required_top if k not in data]
if missing:
    raise SystemExit("fixture missing top-level keys: " + ", ".join(missing))

if data["marker"] != "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1":
    raise SystemExit("fixture marker mismatch")

if data["status"] != "private_operator_fulfillment_review_boundary_only":
    raise SystemExit("fixture status mismatch")

if data["fixture_only"] is not True:
    raise SystemExit("fixture_only must be true")

if data["contains_real_buyer_data"] is not False:
    raise SystemExit("contains_real_buyer_data must be false")

source = data["source_decision_record"]
if source["decision_record_marker"] != "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1":
    raise SystemExit("source decision marker mismatch")
if source["decision_record_exists"] is not True:
    raise SystemExit("decision record must exist")
if source["decision_state"] != "approved_for_manual_fulfillment_review":
    raise SystemExit("source decision state mismatch")
if source["decision_record_operator_approved"] is not True:
    raise SystemExit("decision record operator approval must be true")

pre = data["required_preconditions"]
expected_pre = {
    "decision_record_exists": True,
    "decision_state_is_approved_for_manual_fulfillment_review": True,
    "decision_record_operator_approved": True,
    "duplicate_check_performed": True,
    "duplicate_found": False,
    "sender_wallet_is_receipt_identity": True,
    "candidate_void_amount_computed": True,
    "pool_capacity_confirmed": True,
    "redaction_policy_confirmed": True,
    "manual_operator_review_required": True,
}
for k, v in expected_pre.items():
    if pre.get(k) is not v:
        raise SystemExit(f"precondition mismatch: {k}")
for k, v in {
    "chain_check": "passed_base",
    "asset_check": "passed_usdc",
    "receiver_check": "passed_configured_receiver",
}.items():
    if pre.get(k) != v:
        raise SystemExit(f"precondition mismatch: {k}")

receipt = data["receipt_reference"]
for k in ["tx_hash", "chain", "asset", "sender_wallet", "receiver_address", "amount_usdc", "send_time_or_block"]:
    if k not in receipt:
        raise SystemExit(f"receipt_reference missing {k}")

if receipt["chain"] != "base":
    raise SystemExit("receipt chain must be base in fixture")
if receipt["asset"] != "USDC":
    raise SystemExit("receipt asset must be USDC in fixture")
if not str(receipt["tx_hash"]).startswith("REDACTED_"):
    raise SystemExit("fixture tx_hash must be redacted placeholder")
if not str(receipt["sender_wallet"]).startswith("REDACTED_"):
    raise SystemExit("fixture sender wallet must be redacted placeholder")
if not str(receipt["receiver_address"]).startswith("REDACTED_"):
    raise SystemExit("fixture receiver address must be redacted placeholder")

allowed = set(data["allowed_fulfillment_review_boundary_states"])
expected_allowed = {
    "not_ready",
    "needs_more_info",
    "blocked_duplicate",
    "blocked_capacity",
    "blocked_sender_identity",
    "blocked_delivery_wallet_mismatch",
    "ready_for_separate_manual_fulfillment_record",
}
if allowed != expected_allowed:
    raise SystemExit("allowed fulfillment states mismatch")
if data["fulfillment_review_boundary_state"] not in allowed:
    raise SystemExit("boundary state must be allowed")

delivery = data["sender_delivery_wallet_boundary"]
expected_delivery = {
    "sender_wallet_is_receipt_identity": True,
    "sender_wallet_is_default_fulfillment_identity": True,
    "different_delivery_wallet_requested": False,
    "different_delivery_wallet_requires_separate_operator_approval": True,
    "wallet_proof_may_be_required": True,
    "automatic_delivery_wallet_override_allowed": False,
}
for k, v in expected_delivery.items():
    if delivery.get(k) is not v:
        raise SystemExit(f"delivery boundary mismatch: {k}")
if delivery["different_delivery_wallet"] is not None:
    raise SystemExit("fixture different delivery wallet must be null")

calc = data["calculation"]
if calc["price_usdc_per_void"] != "0.50":
    raise SystemExit("price mismatch")
if calc["rate_void_per_usdc"] != "2":
    raise SystemExit("rate mismatch")
if calc["candidate_void_amount"] != "200.00":
    raise SystemExit("candidate amount mismatch")
if calc["calculation_is_fulfillment"] is not False:
    raise SystemExit("calculation must not be fulfillment")
if calc["calculation_is_delivery_promise"] is not False:
    raise SystemExit("calculation must not be delivery promise")

pool = data["pool_capacity_boundary"]
if pool["pool_total_void"] != "10000000":
    raise SystemExit("pool total mismatch")
if pool["max_raise_usdc"] != "5000000":
    raise SystemExit("max raise mismatch")
if pool["allocation_available_at_review_time"] != "operator_must_confirm":
    raise SystemExit("allocation availability rule mismatch")
if pool["pool_closed"] is not False:
    raise SystemExit("fixture pool closed must be false")
if pool["pool_capacity_confirmed_for_fixture"] is not True:
    raise SystemExit("fixture pool capacity confirmed must be true")

redaction = data["redaction_policy"]
if redaction["public_release_allowed"] is not False:
    raise SystemExit("public release must not be allowed")
for k in [
    "public_release_requires_redaction",
    "do_not_publish_buyer_contact_details",
    "do_not_publish_private_queue_state",
    "do_not_publish_internal_notes",
    "do_not_publish_secrets",
]:
    if redaction[k] is not True:
        raise SystemExit(f"redaction {k} must be true")

att = data["operator_attestation"]
if att["operator_reviewed_boundary_manually"] is not True:
    raise SystemExit("operator reviewed boundary manually must be true")
if att["operator_approved_real_fulfillment_execution"] is not False:
    raise SystemExit("fixture must not approve real fulfillment execution")
if att["operator_signature_required_before_real_use"] is not True:
    raise SystemExit("operator signature must be required before real use")

flags = data["safety_flags"]
expected_flags = {
    "private_operator_fulfillment_review_boundary_only": True,
    "wallet_send_command_created": False,
    "wallet_send_enabled": False,
    "private_key_action_enabled": False,
    "token_delivery_transaction_created": False,
    "automatic_fulfillment_enabled": False,
    "automatic_receipt_acceptance_enabled": False,
    "public_receipt_intake_endpoint_open": False,
    "public_receipt_mutation_enabled": False,
    "public_queue_exposed": False,
    "fulfillment_promised": False,
    "investment_return_promised": False,
    "route_added": False,
    "src_index_modified": False,
}
for k, v in expected_flags.items():
    if flags.get(k) is not v:
        raise SystemExit(f"safety flag mismatch: {k}")

if data["next_allowed_step"] != "separate_manual_fulfillment_record_only":
    raise SystemExit("next allowed step mismatch")
PY

# Must not add runtime/public route marker to src/index.ts.
if grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1" "$src" >/dev/null; then
  echo "STOP: private fulfillment boundary marker unexpectedly present in runtime src."
  exit 1
fi

# Must not add new routes; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: lowercase public-node mutation route detected."
  exit 1
fi

if grep -E "APP\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: uppercase public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1_GREEN"

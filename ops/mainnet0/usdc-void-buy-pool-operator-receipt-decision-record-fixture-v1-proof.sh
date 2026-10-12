#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-operator-receipt-decision-record-fixture-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-operator-receipt-decision-record-fixture-v1.json"
src="src/index.ts"

test -f "$doc"
test -f "$fixture"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1" "$doc" >/dev/null
grep -F "private_operator_decision_record_fixture_only" "$doc" >/dev/null
grep -F "public receipt intake endpoint" "$doc" >/dev/null
grep -F "public receipt mutation route" "$doc" >/dev/null
grep -F "public buyer queue" "$doc" >/dev/null
grep -F "automatic receipt acceptance path" "$doc" >/dev/null
grep -F "automatic fulfillment path" "$doc" >/dev/null
grep -F "wallet send action" "$doc" >/dev/null
grep -F "private key action" "$doc" >/dev/null
grep -F "token delivery transaction" "$doc" >/dev/null
grep -F "investment return, yield, or profit promise" "$doc" >/dev/null

grep -F "needs_more_info" "$doc" >/dev/null
grep -F "rejected_wrong_chain" "$doc" >/dev/null
grep -F "rejected_wrong_asset" "$doc" >/dev/null
grep -F "rejected_wrong_receiver" "$doc" >/dev/null
grep -F "rejected_exchange_or_pooled_sender" "$doc" >/dev/null
grep -F "rejected_duplicate_tx_hash" "$doc" >/dev/null
grep -F "rejected_pool_closed" "$doc" >/dev/null
grep -F "valid_receipt_candidate" "$doc" >/dev/null
grep -F "approved_for_manual_fulfillment_review" "$doc" >/dev/null
grep -F "No allowed state performs fulfillment." "$doc" >/dev/null

grep -F "record_type" "$doc" >/dev/null
grep -F "receipt_reference" "$doc" >/dev/null
grep -F "verification_results" "$doc" >/dev/null
grep -F "duplicate_check" "$doc" >/dev/null
grep -F "pool_capacity_check" "$doc" >/dev/null
grep -F "operator_attestation" "$doc" >/dev/null

grep -F "candidate_void_amount = amount_usdc / 0.50" "$doc" >/dev/null
grep -F "candidate_void_amount = amount_usdc * 2" "$doc" >/dev/null
grep -F "This calculation is evidence for the decision record only." "$doc" >/dev/null

grep -F "public_receipt_intake_endpoint_open = false" "$doc" >/dev/null
grep -F "public_receipt_mutation_enabled = false" "$doc" >/dev/null
grep -F "public_queue_exposed = false" "$doc" >/dev/null
grep -F "automatic_receipt_acceptance_enabled = false" "$doc" >/dev/null
grep -F "automatic_fulfillment_enabled = false" "$doc" >/dev/null
grep -F "wallet_send_enabled = false" "$doc" >/dev/null
grep -F "private_key_action_enabled = false" "$doc" >/dev/null
grep -F "token_delivery_transaction_created = false" "$doc" >/dev/null
grep -F "fulfillment_promised = false" "$doc" >/dev/null
grep -F "investment_return_promised = false" "$doc" >/dev/null
grep -F "route_added = false" "$doc" >/dev/null
grep -F "src_index_modified = false" "$doc" >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

fixture = Path("fixtures/private/usdc-void-buy-pool-operator-receipt-decision-record-fixture-v1.json")
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
    "decision_state",
    "allowed_decision_states",
    "receipt_reference",
    "review_inputs",
    "verification_results",
    "duplicate_check",
    "calculation",
    "pool_capacity_check",
    "sender_identity_rule",
    "redaction_policy",
    "next_allowed_step",
    "operator_attestation",
    "safety_flags",
]
missing = [k for k in required_top if k not in data]
if missing:
    raise SystemExit("fixture missing top-level keys: " + ", ".join(missing))

if data["marker"] != "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1":
    raise SystemExit("fixture marker mismatch")

if data["status"] != "private_operator_decision_record_fixture_only":
    raise SystemExit("fixture status mismatch")

if data["fixture_only"] is not True:
    raise SystemExit("fixture_only must be true")

if data["contains_real_buyer_data"] is not False:
    raise SystemExit("contains_real_buyer_data must be false")

allowed = set(data["allowed_decision_states"])
expected_allowed = {
    "needs_more_info",
    "rejected_wrong_chain",
    "rejected_wrong_asset",
    "rejected_wrong_receiver",
    "rejected_exchange_or_pooled_sender",
    "rejected_duplicate_tx_hash",
    "rejected_pool_closed",
    "valid_receipt_candidate",
    "approved_for_manual_fulfillment_review",
}
if allowed != expected_allowed:
    raise SystemExit("allowed decision states mismatch")

if data["decision_state"] not in allowed:
    raise SystemExit("decision_state must be one of allowed states")

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

dup = data["duplicate_check"]
if dup["performed"] is not True:
    raise SystemExit("duplicate check must be performed")
if dup["duplicate_found"] is not False:
    raise SystemExit("fixture duplicate_found must be false")

sender_rule = data["sender_identity_rule"]
if sender_rule["sender_wallet_is_receipt_identity"] is not True:
    raise SystemExit("sender wallet must be receipt identity")
if sender_rule["sender_wallet_is_default_fulfillment_identity"] is not True:
    raise SystemExit("sender wallet must be default fulfillment identity")
if sender_rule["different_delivery_wallet_requires_separate_operator_approval"] is not True:
    raise SystemExit("different delivery wallet must require separate approval")

redaction = data["redaction_policy"]
for k in [
    "public_release_allowed",
]:
    if redaction[k] is not False:
        raise SystemExit(f"redaction {k} must be false")
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
if att["operator_reviewed_manually"] is not True:
    raise SystemExit("operator_reviewed_manually must be true")
if att["operator_approved_this_decision_record"] is not False:
    raise SystemExit("fixture must not approve real decision")
if att["operator_signature_required_before_real_use"] is not True:
    raise SystemExit("operator signature must be required before real use")

flags = data["safety_flags"]
expected_flags = {
    "private_operator_decision_record_fixture_only": True,
    "public_receipt_intake_endpoint_open": False,
    "public_receipt_mutation_enabled": False,
    "public_queue_exposed": False,
    "automatic_receipt_acceptance_enabled": False,
    "automatic_fulfillment_enabled": False,
    "wallet_send_enabled": False,
    "private_key_action_enabled": False,
    "token_delivery_transaction_created": False,
    "fulfillment_promised": False,
    "investment_return_promised": False,
    "route_added": False,
    "src_index_modified": False,
}
for k, v in expected_flags.items():
    if flags.get(k) is not v:
        raise SystemExit(f"safety flag mismatch: {k}")

if data["next_allowed_step"] != "separate_operator_fulfillment_review_only":
    raise SystemExit("next allowed step mismatch")
PY

# Must not add runtime/public route marker to src/index.ts.
if grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1" "$src" >/dev/null; then
  echo "STOP: private decision fixture marker unexpectedly present in runtime src."
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

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1_GREEN"

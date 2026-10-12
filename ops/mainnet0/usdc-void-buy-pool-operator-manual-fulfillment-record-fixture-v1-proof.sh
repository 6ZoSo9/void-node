#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-operator-manual-fulfillment-record-fixture-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-operator-manual-fulfillment-record-fixture-v1.json"
src="src/index.ts"

test -f "$doc"
test -f "$fixture"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1" "$doc" >/dev/null
grep -F "private_operator_manual_fulfillment_record_fixture_only" "$doc" >/dev/null
grep -F "wallet send command" "$doc" >/dev/null
grep -F "execution command" "$doc" >/dev/null
grep -F "private-key action" "$doc" >/dev/null
grep -F "token delivery transaction" "$doc" >/dev/null
grep -F "automatic fulfillment path" "$doc" >/dev/null
grep -F "automatic receipt acceptance path" "$doc" >/dev/null
grep -F "public receipt intake endpoint" "$doc" >/dev/null
grep -F "public mutation route" "$doc" >/dev/null
grep -F "public buyer queue" "$doc" >/dev/null
grep -F "guaranteed delivery" "$doc" >/dev/null
grep -F "investment return, yield, or profit promise" "$doc" >/dev/null

grep -F "ready_for_separate_manual_fulfillment_record" "$doc" >/dev/null
grep -F "That state is not execution." "$doc" >/dev/null
grep -F "This fixture is not execution." "$doc" >/dev/null

grep -F "draft" "$doc" >/dev/null
grep -F "needs_more_info" "$doc" >/dev/null
grep -F "blocked_boundary_not_ready" "$doc" >/dev/null
grep -F "blocked_duplicate" "$doc" >/dev/null
grep -F "blocked_capacity" "$doc" >/dev/null
grep -F "blocked_sender_identity" "$doc" >/dev/null
grep -F "blocked_delivery_wallet_mismatch" "$doc" >/dev/null
grep -F "approved_for_separate_manual_execution_packet" "$doc" >/dev/null
grep -F "No state performs token delivery." "$doc" >/dev/null
grep -F "No state creates a wallet transaction." "$doc" >/dev/null
grep -F "No state authorizes an automatic process." "$doc" >/dev/null

grep -F "candidate_void_amount = amount_usdc / 0.50" "$doc" >/dev/null
grep -F "candidate_void_amount = amount_usdc * 2" "$doc" >/dev/null
grep -F "This calculation is record evidence only." "$doc" >/dev/null
grep -F "It is not a token delivery transaction." "$doc" >/dev/null
grep -F "It is not a delivery promise." "$doc" >/dev/null
grep -F "It is not an investment return promise." "$doc" >/dev/null

grep -F "transaction calldata" "$doc" >/dev/null
grep -F "private key material" "$doc" >/dev/null
grep -F "wallet command" "$doc" >/dev/null
grep -F "signed transaction" "$doc" >/dev/null
grep -F "broadcast command" "$doc" >/dev/null
grep -F "RPC write action" "$doc" >/dev/null
grep -F "token transfer execution" "$doc" >/dev/null

grep -F "execution_command_created = false" "$doc" >/dev/null
grep -F "execution_packet_created = false" "$doc" >/dev/null
grep -F "wallet_send_command_created = false" "$doc" >/dev/null
grep -F "wallet_send_enabled = false" "$doc" >/dev/null
grep -F "private_key_action_enabled = false" "$doc" >/dev/null
grep -F "signed_transaction_created = false" "$doc" >/dev/null
grep -F "broadcast_transaction_enabled = false" "$doc" >/dev/null
grep -F "rpc_write_enabled = false" "$doc" >/dev/null
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

fixture = Path("fixtures/private/usdc-void-buy-pool-operator-manual-fulfillment-record-fixture-v1.json")
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
    "source_records",
    "manual_fulfillment_record_state",
    "allowed_manual_fulfillment_record_states",
    "receipt_reference",
    "fulfillment_identity",
    "manual_calculation",
    "pool_capacity_check",
    "operator_approval",
    "execution_separation",
    "redaction_policy",
    "safety_flags",
]
missing = [k for k in required_top if k not in data]
if missing:
    raise SystemExit("fixture missing top-level keys: " + ", ".join(missing))

if data["marker"] != "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1":
    raise SystemExit("fixture marker mismatch")
if data["status"] != "private_operator_manual_fulfillment_record_fixture_only":
    raise SystemExit("fixture status mismatch")
if data["fixture_only"] is not True:
    raise SystemExit("fixture_only must be true")
if data["contains_real_buyer_data"] is not False:
    raise SystemExit("contains_real_buyer_data must be false")

source = data["source_records"]
expected_sources = {
    "receipt_review_packet_marker": "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1",
    "decision_record_marker": "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1",
    "fulfillment_review_boundary_marker": "VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1",
    "fulfillment_review_boundary_state": "ready_for_separate_manual_fulfillment_record",
}
for k, v in expected_sources.items():
    if source.get(k) != v:
        raise SystemExit(f"source record mismatch: {k}")

allowed = set(data["allowed_manual_fulfillment_record_states"])
expected_allowed = {
    "draft",
    "needs_more_info",
    "blocked_boundary_not_ready",
    "blocked_duplicate",
    "blocked_capacity",
    "blocked_sender_identity",
    "blocked_delivery_wallet_mismatch",
    "approved_for_separate_manual_execution_packet",
}
if allowed != expected_allowed:
    raise SystemExit("allowed manual fulfillment states mismatch")
if data["manual_fulfillment_record_state"] not in allowed:
    raise SystemExit("manual fulfillment record state must be allowed")

receipt = data["receipt_reference"]
for k in ["tx_hash", "chain", "asset", "sender_wallet", "receiver_address", "amount_usdc", "send_time_or_block"]:
    if k not in receipt:
        raise SystemExit(f"receipt_reference missing {k}")
if receipt["chain"] != "base":
    raise SystemExit("receipt chain must be base")
if receipt["asset"] != "USDC":
    raise SystemExit("receipt asset must be USDC")
if not str(receipt["tx_hash"]).startswith("REDACTED_"):
    raise SystemExit("fixture tx hash must be redacted placeholder")
if not str(receipt["sender_wallet"]).startswith("REDACTED_"):
    raise SystemExit("fixture sender wallet must be redacted placeholder")
if not str(receipt["receiver_address"]).startswith("REDACTED_"):
    raise SystemExit("fixture receiver address must be redacted placeholder")

identity = data["fulfillment_identity"]
expected_identity = {
    "sender_wallet_is_receipt_identity": True,
    "sender_wallet_is_default_fulfillment_identity": True,
    "destination_wallet_matches_sender_wallet": True,
    "different_destination_wallet_requested": False,
    "different_destination_wallet_requires_separate_operator_approval": True,
    "wallet_proof_may_be_required": True,
    "automatic_destination_wallet_override_allowed": False,
}
for k, v in expected_identity.items():
    if identity.get(k) is not v:
        raise SystemExit(f"identity mismatch: {k}")
if not str(identity["destination_wallet"]).startswith("REDACTED_"):
    raise SystemExit("destination wallet must be redacted placeholder")

calc = data["manual_calculation"]
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
if calc["calculation_is_investment_return_promise"] is not False:
    raise SystemExit("calculation must not be investment return promise")

pool = data["pool_capacity_check"]
if pool["pool_total_void"] != "10000000":
    raise SystemExit("pool total mismatch")
if pool["max_raise_usdc"] != "5000000":
    raise SystemExit("max raise mismatch")
if pool["allocation_available_at_review_time"] != "operator_must_confirm":
    raise SystemExit("allocation availability rule mismatch")
if pool["pool_closed"] is not False:
    raise SystemExit("fixture pool closed must be false")
if pool["pool_capacity_confirmed_for_fixture"] is not True:
    raise SystemExit("fixture pool capacity must be true")

approval = data["operator_approval"]
expected_approval = {
    "operator_reviewed_receipt": True,
    "operator_reviewed_decision_record": True,
    "operator_reviewed_fulfillment_boundary": True,
    "operator_approved_manual_fulfillment_record_fixture": True,
    "operator_approved_real_execution": False,
    "operator_signature_required_before_real_use": True,
}
for k, v in expected_approval.items():
    if approval.get(k) is not v:
        raise SystemExit(f"operator approval mismatch: {k}")

sep = data["execution_separation"]
expected_sep = {
    "execution_packet_required": True,
    "execution_packet_created_now": False,
    "transaction_calldata_created_now": False,
    "private_key_material_used_now": False,
    "signed_transaction_created_now": False,
    "broadcast_transaction_created_now": False,
    "rpc_write_action_created_now": False,
    "token_transfer_executed_now": False,
}
for k, v in expected_sep.items():
    if sep.get(k) is not v:
        raise SystemExit(f"execution separation mismatch: {k}")
if sep["next_allowed_step"] != "separate_manual_execution_packet_only":
    raise SystemExit("next allowed step mismatch")

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

flags = data["safety_flags"]
expected_flags = {
    "private_operator_manual_fulfillment_record_fixture_only": True,
    "manual_fulfillment_record_created_for_fixture": True,
    "execution_command_created": False,
    "execution_packet_created": False,
    "wallet_send_command_created": False,
    "wallet_send_enabled": False,
    "private_key_action_enabled": False,
    "signed_transaction_created": False,
    "broadcast_transaction_enabled": False,
    "rpc_write_enabled": False,
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
PY

# Must not add runtime/public route marker to src/index.ts.
if grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1" "$src" >/dev/null; then
  echo "STOP: private manual fulfillment fixture marker unexpectedly present in runtime src."
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

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1_GREEN"

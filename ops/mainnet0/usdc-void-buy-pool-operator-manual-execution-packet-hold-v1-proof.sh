#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-operator-manual-execution-packet-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-operator-manual-execution-packet-hold-v1.json"
src="src/index.ts"

test -f "$doc"
test -f "$fixture"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" "$doc" >/dev/null
grep -F "private_operator_manual_execution_packet_hold_only" "$doc" >/dev/null
grep -F "wallet send command" "$doc" >/dev/null
grep -F "execution command" "$doc" >/dev/null
grep -F "transaction calldata" "$doc" >/dev/null
grep -F "private-key material" "$doc" >/dev/null
grep -F "private-key action" "$doc" >/dev/null
grep -F "signed transaction" "$doc" >/dev/null
grep -F "broadcast command" "$doc" >/dev/null
grep -F "RPC write action" "$doc" >/dev/null
grep -F "token delivery transaction" "$doc" >/dev/null
grep -F "token transfer execution" "$doc" >/dev/null
grep -F "automatic fulfillment path" "$doc" >/dev/null
grep -F "automatic receipt acceptance path" "$doc" >/dev/null
grep -F "public receipt intake endpoint" "$doc" >/dev/null
grep -F "public mutation route" "$doc" >/dev/null
grep -F "public buyer queue" "$doc" >/dev/null
grep -F "guaranteed delivery" "$doc" >/dev/null
grep -F "investment return, yield, or profit promise" "$doc" >/dev/null

grep -F "approved_for_separate_manual_execution_packet" "$doc" >/dev/null
grep -F "That state is not execution." "$doc" >/dev/null
grep -F "This hold is not execution." "$doc" >/dev/null
grep -F "withheld execution packet shape only" "$doc" >/dev/null

grep -F "draft_hold" "$doc" >/dev/null
grep -F "blocked_missing_manual_fulfillment_record" "$doc" >/dev/null
grep -F "blocked_identity_mismatch" "$doc" >/dev/null
grep -F "blocked_capacity" "$doc" >/dev/null
grep -F "held_execution_packet_shape_only" "$doc" >/dev/null
grep -F "ready_for_separate_operator_execution_packet" "$doc" >/dev/null
grep -F "No state performs token delivery." "$doc" >/dev/null
grep -F "No state creates transaction calldata." "$doc" >/dev/null
grep -F "No state creates a wallet transaction." "$doc" >/dev/null
grep -F "No state signs a transaction." "$doc" >/dev/null
grep -F "No state broadcasts a transaction." "$doc" >/dev/null
grep -F "No state authorizes an automatic process." "$doc" >/dev/null

grep -F "candidate_void_amount = amount_usdc / 0.50" "$doc" >/dev/null
grep -F "candidate_void_amount = amount_usdc * 2" "$doc" >/dev/null
grep -F "This calculation is packet evidence only." "$doc" >/dev/null
grep -F "It is not transaction calldata." "$doc" >/dev/null
grep -F "It is not a token delivery transaction." "$doc" >/dev/null
grep -F "It is not a delivery promise." "$doc" >/dev/null
grep -F "It is not an investment return promise." "$doc" >/dev/null

grep -F "command_withheld = true" "$doc" >/dev/null
grep -F "calldata_withheld = true" "$doc" >/dev/null
grep -F "signed_transaction_withheld = true" "$doc" >/dev/null
grep -F "broadcast_withheld = true" "$doc" >/dev/null
grep -F "private_key_required_now = false" "$doc" >/dev/null
grep -F "operator_must_execute_separately = true" "$doc" >/dev/null

grep -F "execution_command_created = false" "$doc" >/dev/null
grep -F "calldata_created = false" "$doc" >/dev/null
grep -F "private_key_action_enabled = false" "$doc" >/dev/null
grep -F "wallet_send_command_created = false" "$doc" >/dev/null
grep -F "wallet_send_enabled = false" "$doc" >/dev/null
grep -F "signed_transaction_created = false" "$doc" >/dev/null
grep -F "broadcast_transaction_enabled = false" "$doc" >/dev/null
grep -F "rpc_write_enabled = false" "$doc" >/dev/null
grep -F "token_delivery_transaction_created = false" "$doc" >/dev/null
grep -F "token_transfer_executed_now = false" "$doc" >/dev/null
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

fixture = Path("fixtures/private/usdc-void-buy-pool-operator-manual-execution-packet-hold-v1.json")
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
    "manual_execution_packet_hold_state",
    "allowed_manual_execution_packet_hold_states",
    "receipt_reference",
    "destination_rule",
    "manual_calculation",
    "pool_capacity_check",
    "execution_hold",
    "operator_hold_attestation",
    "redaction_policy",
    "safety_flags",
]
missing = [k for k in required_top if k not in data]
if missing:
    raise SystemExit("fixture missing top-level keys: " + ", ".join(missing))

if data["marker"] != "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1":
    raise SystemExit("fixture marker mismatch")
if data["status"] != "private_operator_manual_execution_packet_hold_only":
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
    "manual_fulfillment_record_marker": "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1",
    "manual_fulfillment_record_state": "approved_for_separate_manual_execution_packet",
}
for k, v in expected_sources.items():
    if source.get(k) != v:
        raise SystemExit(f"source record mismatch: {k}")

allowed = set(data["allowed_manual_execution_packet_hold_states"])
expected_allowed = {
    "draft_hold",
    "blocked_missing_manual_fulfillment_record",
    "blocked_identity_mismatch",
    "blocked_capacity",
    "held_execution_packet_shape_only",
    "ready_for_separate_operator_execution_packet",
}
if allowed != expected_allowed:
    raise SystemExit("allowed hold states mismatch")
if data["manual_execution_packet_hold_state"] not in allowed:
    raise SystemExit("manual execution packet hold state must be allowed")

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

destination = data["destination_rule"]
expected_destination = {
    "sender_wallet_is_receipt_identity": True,
    "sender_wallet_is_default_fulfillment_identity": True,
    "destination_wallet_matches_sender_wallet": True,
    "different_destination_wallet_requested": False,
    "different_destination_wallet_requires_separate_operator_approval": True,
    "wallet_proof_may_be_required": True,
    "automatic_destination_wallet_override_allowed": False,
}
for k, v in expected_destination.items():
    if destination.get(k) is not v:
        raise SystemExit(f"destination mismatch: {k}")
if not str(destination["destination_wallet"]).startswith("REDACTED_"):
    raise SystemExit("destination wallet must be redacted placeholder")

calc = data["manual_calculation"]
if calc["price_usdc_per_void"] != "0.50":
    raise SystemExit("price mismatch")
if calc["rate_void_per_usdc"] != "2":
    raise SystemExit("rate mismatch")
if calc["candidate_void_amount"] != "200.00":
    raise SystemExit("candidate amount mismatch")
for k in [
    "calculation_is_calldata",
    "calculation_is_fulfillment",
    "calculation_is_delivery_promise",
    "calculation_is_investment_return_promise",
]:
    if calc[k] is not False:
        raise SystemExit(f"calculation flag must be false: {k}")

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

hold = data["execution_hold"]
expected_hold = {
    "execution_packet_shape_defined": True,
    "execution_packet_created_now": False,
    "execution_command_created": False,
    "command_withheld": True,
    "calldata_created": False,
    "calldata_withheld": True,
    "private_key_required_now": False,
    "private_key_material_used_now": False,
    "wallet_send_command_created": False,
    "wallet_send_enabled": False,
    "signed_transaction_created": False,
    "signed_transaction_withheld": True,
    "broadcast_transaction_enabled": False,
    "broadcast_withheld": True,
    "rpc_write_enabled": False,
    "token_delivery_transaction_created": False,
    "token_transfer_executed_now": False,
    "operator_must_execute_separately": True,
}
for k, v in expected_hold.items():
    if hold.get(k) is not v:
        raise SystemExit(f"execution hold mismatch: {k}")
for k in ["execution_command", "transaction_calldata", "private_key_material", "signed_transaction", "broadcast_command"]:
    if hold.get(k) is not None:
        raise SystemExit(f"withheld execution field must be null: {k}")
if hold["token_contract_address"] != "WITHHELD_TOKEN_CONTRACT_ADDRESS":
    raise SystemExit("token contract address must be withheld")
if hold["source_wallet"] != "WITHHELD_OPERATOR_SOURCE_WALLET":
    raise SystemExit("source wallet must be withheld")

att = data["operator_hold_attestation"]
if att["operator_reviewed_manual_fulfillment_record"] is not True:
    raise SystemExit("operator reviewed manual fulfillment record must be true")
if att["operator_reviewed_execution_hold"] is not True:
    raise SystemExit("operator reviewed execution hold must be true")
if att["operator_approved_real_execution"] is not False:
    raise SystemExit("operator must not approve real execution in fixture")
if att["operator_signature_required_before_real_use"] is not True:
    raise SystemExit("operator signature required must be true")

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
    "private_operator_manual_execution_packet_hold_only": True,
    "execution_packet_hold_created_for_fixture": True,
    "execution_command_created": False,
    "command_withheld": True,
    "calldata_created": False,
    "calldata_withheld": True,
    "private_key_required_now": False,
    "private_key_action_enabled": False,
    "wallet_send_command_created": False,
    "wallet_send_enabled": False,
    "signed_transaction_created": False,
    "signed_transaction_withheld": True,
    "broadcast_transaction_enabled": False,
    "broadcast_withheld": True,
    "rpc_write_enabled": False,
    "token_delivery_transaction_created": False,
    "token_transfer_executed_now": False,
    "operator_must_execute_separately": True,
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
if grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" "$src" >/dev/null; then
  echo "STOP: private manual execution packet hold marker unexpectedly present in runtime src."
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

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1_GREEN"

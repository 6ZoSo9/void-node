#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-result-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_RESULT_HOLD_V1"
prev_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1"

doc="docs/private/$name.md"
fixture="fixtures/private/$name.json"
proof="ops/mainnet0/$name-proof.sh"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_RESULT_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
echo "automatic_payment_operator_dry_run_decision_result_hold_doc_exists=true"

test -f "$fixture"
echo "automatic_payment_operator_dry_run_decision_result_hold_fixture_exists=true"

test -f "$proof"
echo "automatic_payment_operator_dry_run_decision_result_hold_proof_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_operator_dry_run_decision_result_hold_marker_green=true"

grep -Fq "$prev_marker" "$doc"
grep -Fq "$prev_marker" "$fixture"
echo "automatic_payment_operator_dry_run_decision_result_hold_dependency_marker_green=true"

if git grep -F "$marker" -- docs/public fixtures/public src >/tmp/void-dry-run-decision-result-public-leak.txt 2>/dev/null; then
  cat /tmp/void-dry-run-decision-result-public-leak.txt
  echo "automatic_payment_operator_dry_run_decision_result_hold_no_public_or_src_leak=false"
  exit 1
else
  echo "automatic_payment_operator_dry_run_decision_result_hold_no_public_or_src_leak=true"
fi

export fixture marker prev_marker
python3 <<'PY'
import json
import os

fixture = os.environ["fixture"]
marker = os.environ["marker"]
prev_marker = os.environ["prev_marker"]

with open(fixture, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_operator_dry_run_decision_result_hold_v1"
assert data["visibility"] == "private_operator_only"
assert data["status"] == "operator_dry_run_decision_result_hold"
assert data["sealed_dependency"]["marker"] == prev_marker
assert data["sealed_dependency"]["head"] == "75e1d11a"

scope = data["result_scope"]
assert scope["dry_run_only"] is True
for key in [
    "real_payment_verification",
    "payment_approval",
    "allocation_creation",
    "inventory_reserve",
    "ledger_write",
    "fulfillment_execution",
    "void_transfer",
]:
    assert scope[key] is False, key

required_states = {
    "operator_dry_run_not_evaluated",
    "operator_dry_run_candidate_eligible",
    "operator_dry_run_candidate_rejected",
    "operator_dry_run_candidate_held_manual_review",
    "operator_dry_run_blocked_missing_verified_payment",
    "operator_dry_run_blocked_duplicate_payment",
    "operator_dry_run_blocked_inventory",
    "operator_dry_run_blocked_identity_mismatch",
    "operator_dry_run_blocked_amount_rate_policy",
    "operator_dry_run_blocked_finality",
}
assert required_states.issubset(set(data["allowed_result_states"]))

public_surface = data["public_surface"]
for key, value in public_surface.items():
    assert value is False, key

authority = data["authority"]
for key, value in authority.items():
    assert value is False, key

required_fields = set(data["result_record_required_fields"])
for field in [
    "dry_run_decision_result_id",
    "source_decision_packet_id",
    "operator_key_id",
    "decision_state",
    "decision_reason_code",
    "decision_timestamp_utc",
    "checked_gate_markers",
    "authority_false_snapshot",
    "previous_private_result_hash",
    "result_hash",
]:
    assert field in required_fields, field

print("automatic_payment_operator_dry_run_decision_result_hold_json_semantics_green=true")
PY

echo "automatic_payment_operator_dry_run_decision_result_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_RESULT_HOLD_V1_GREEN"

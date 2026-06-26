#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-operator-final-approval-gate-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_OPERATOR_FINAL_APPROVAL_GATE_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "operator_final_approval_gate_hold_files_and_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-operator-final-approval-gate-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_OPERATOR_FINAL_APPROVAL_GATE_HOLD_V1"

j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_operator_final_approval_gate_held"
assert j["scope"] == "private_operator_only_operator_final_approval_gate_hold_not_activation_approval"
assert j["precision_source_of_truth"] is True

assert j["execution_performed_gate_status"] == "activation_candidate_preflight_execution_performed_gate_held"
assert j["next_required_gate"] == "activation_candidate_preflight_activation_release_gate_hold_v1"

gate = j["operator_final_approval_gate"]
assert gate["gate_state"] == "held_closed"
assert gate["operator_final_approval_granted"] is False
assert gate["activation_approved"] is False
assert gate["activation_enabled"] is False
assert gate["activation_candidate_released"] is False

checks = j["gate_hold_checks"]
assert isinstance(checks, list)
assert len(checks) >= 22

boundary = j["boundary"]

required_true = [
    "operator_final_approval_gate_hold",
    "execution_performed_gate_hold_complete",
    "signing_gate_hold_complete",
    "void_transfer_gate_hold_complete",
    "transaction_broadcast_gate_hold_complete",
    "fulfilled_state_write_gate_hold_complete",
    "public_mutation_gate_hold_complete",
    "automatic_fulfillment_enablement_gate_hold_complete",
    "wallet_fulfillment_gate_hold_complete",
    "signer_access_gate_hold_complete",
    "actual_execute_gate_hold_complete",
    "terminal_authority_gate_hold_complete",
    "execution_plan_only",
]
for k in required_true:
    assert boundary[k] is True, k

required_false = [
    "operator_final_approval_granted",
    "activation_approved",
    "activation_enabled",
    "activation_candidate_released",
    "automatic_fulfillment_enabled",
    "wallet_fulfillment_enabled",
    "signer_access_granted",
    "terminal_execute_authorized",
    "actual_execute_authorized",
    "actual_execute_performed",
    "execution_performed",
    "operator_execution_performed",
    "automatic_execution_performed",
    "runtime_execution_performed",
    "void_transfer_performed",
    "transaction_broadcast_performed",
    "fulfilled_state_written",
    "public_mutation_performed",
    "private_key_accessed",
    "signature_created",
    "signing_payload_created",
]
for k in required_false:
    assert boundary.get(k, False) is False, k

print("operator_final_approval_gate_hold_fixture_green=true")
print("operator_final_approval_gate_held_closed_green=true")
print("operator_final_approval_gate_hold_boundary_green=true")
print("operator_final_approval_gate_hold_no_operator_final_approval=true")
print("operator_final_approval_gate_hold_no_activation_approval=true")
print("operator_final_approval_gate_hold_no_activation_enablement=true")
print("operator_final_approval_gate_hold_no_activation_release=true")
PY

if grep -RInF 'git status --short' "$doc" "$fixture"; then
  echo "operator_final_approval_gate_hold_command_contamination=red"
  exit 1
fi

if grep -RInF 'zoso@' "$doc" "$fixture"; then
  echo "operator_final_approval_gate_hold_prompt_contamination=red"
  exit 1
fi

echo "operator_final_approval_gate_hold_contamination_absent=true"

grep -Fq "not activation approval" "$doc"
grep -Fq "not activation enablement" "$doc"

echo "operator_final_approval_gate_hold_no_signing=true"
echo "operator_final_approval_gate_hold_no_signature=true"
echo "operator_final_approval_gate_hold_no_private_key_access=true"
echo "operator_final_approval_gate_hold_no_void_transfer=true"
echo "operator_final_approval_gate_hold_no_transaction_broadcast=true"

echo "${marker}_GREEN"

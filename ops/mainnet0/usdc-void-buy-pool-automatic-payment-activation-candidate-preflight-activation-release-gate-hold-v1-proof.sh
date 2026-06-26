#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-activation-release-gate-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_ACTIVATION_RELEASE_GATE_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "activation_release_gate_hold_files_and_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-activation-release-gate-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_ACTIVATION_RELEASE_GATE_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_activation_release_gate_held"
assert j["scope"] == "private_operator_only_activation_release_gate_hold_not_activation_release"
assert j["precision_source_of_truth"] is True

assert j["operator_final_approval_gate_status"] == "activation_candidate_preflight_operator_final_approval_gate_held"
assert j["next_required_gate"] == "activation_candidate_preflight_activation_release_closeout_hold_v1"

gate = j["activation_release_gate"]
assert gate["gate_state"] == "held_closed"
assert gate["activation_release_granted"] is False
assert gate["activation_candidate_released"] is False
assert gate["activation_enabled"] is False
assert gate["automatic_fulfillment_enabled"] is False
assert gate["runtime_activation_enabled"] is False
assert gate["public_activation_visible"] is False
assert gate["release_result_written"] is False

checks = j["gate_hold_checks"]
assert isinstance(checks, list)
assert len(checks) >= 20

boundary = j["boundary"]

required_true = [
    "activation_release_gate_hold",
    "operator_final_approval_gate_hold_complete",
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
    "release_plan_only",
]
for k in required_true:
    assert boundary[k] is True, k

required_false = [
    "operator_final_approval_granted",
    "activation_release_granted",
    "activation_candidate_released",
    "activation_approved",
    "activation_enabled",
    "runtime_activation_enabled",
    "public_activation_visible",
    "release_result_written",
    "automatic_fulfillment_enabled",
    "wallet_fulfillment_enabled",
    "signer_access_granted",
    "terminal_execute_authorized",
    "actual_execute_authorized",
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

print("activation_release_gate_hold_fixture_green=true")
print("activation_release_gate_held_closed_green=true")
print("activation_release_gate_hold_boundary_green=true")
print("activation_release_gate_hold_no_activation_release=true")
print("activation_release_gate_hold_no_activation_enablement=true")
print("activation_release_gate_hold_no_public_activation=true")
print("activation_release_gate_hold_no_release_result_write=true")
PY

if grep -RInF 'git status --short' "$doc" "$fixture"; then
  echo "activation_release_gate_hold_command_contamination=red"
  exit 1
fi

if grep -RInF 'zoso@' "$doc" "$fixture"; then
  echo "activation_release_gate_hold_prompt_contamination=red"
  exit 1
fi

echo "activation_release_gate_hold_contamination_absent=true"

grep -Fq "not activation release" "$doc"
grep -Fq "not activation enablement" "$doc"

echo "activation_release_gate_hold_no_signing=true"
echo "activation_release_gate_hold_no_signature=true"
echo "activation_release_gate_hold_no_private_key_access=true"
echo "activation_release_gate_hold_no_void_transfer=true"
echo "activation_release_gate_hold_no_transaction_broadcast=true"

echo "${marker}_GREEN"

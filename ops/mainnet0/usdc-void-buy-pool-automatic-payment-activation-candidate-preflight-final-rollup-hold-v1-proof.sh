#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-final-rollup-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FINAL_ROLLUP_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "final_rollup_hold_files_and_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-final-rollup-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FINAL_ROLLUP_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_final_rollup_held"
assert j["scope"] == "private_operator_only_final_rollup_hold_not_activation_not_release"
assert j["precision_source_of_truth"] is True
assert j["activation_release_closeout_status"] == "activation_candidate_preflight_activation_release_closeout_held"
assert j["next_required_gate"] == "activation_candidate_preflight_final_seal_hold_v1"

rollup = j["final_rollup"]
assert rollup["rollup_state"] == "held_closed"
assert rollup["preflight_chain_complete_as_hold"] is True
assert rollup["activation_ready"] is False
assert rollup["activation_released"] is False
assert rollup["activation_enabled"] is False
assert rollup["automatic_fulfillment_enabled"] is False
assert rollup["operator_final_approval_granted"] is False
assert rollup["execution_performed"] is False
assert rollup["closeout_record_written"] is False
assert rollup["public_activation_visible"] is False

held_chain = j["held_chain"]
assert isinstance(held_chain, list)
assert len(held_chain) >= 15
assert held_chain[-1] == "final_rollup_hold"

required_chain = [
    "terminal_authority_gate_hold",
    "actual_execute_gate_hold",
    "signer_access_gate_hold",
    "wallet_fulfillment_gate_hold",
    "automatic_fulfillment_enablement_gate_hold",
    "public_mutation_gate_hold",
    "fulfilled_state_write_gate_hold",
    "transaction_broadcast_gate_hold",
    "void_transfer_gate_hold",
    "signing_gate_hold",
    "execution_performed_gate_hold",
    "operator_final_approval_gate_hold",
    "activation_release_gate_hold",
    "activation_release_closeout_hold",
    "final_rollup_hold",
]
for item in required_chain:
    assert item in held_chain, item

boundary = j["boundary"]

required_true = [
    "final_rollup_hold",
    "activation_release_closeout_hold_complete",
    "activation_release_gate_hold_complete",
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
    "rollup_plan_only",
]
for k in required_true:
    assert boundary[k] is True, k

required_false = [
    "activation_ready",
    "activation_released",
    "activation_enabled",
    "activation_release_granted",
    "activation_release_closed_out",
    "activation_candidate_released",
    "activation_approved",
    "runtime_activation_enabled",
    "public_activation_visible",
    "release_result_written",
    "closeout_record_written",
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

print("final_rollup_hold_fixture_green=true")
print("final_rollup_held_closed_green=true")
print("final_rollup_hold_chain_green=true")
print("final_rollup_hold_boundary_green=true")
print("final_rollup_hold_no_activation_ready=true")
print("final_rollup_hold_no_activation_release=true")
print("final_rollup_hold_no_activation_enablement=true")
print("final_rollup_hold_no_execution=true")
PY

if grep -RInF 'git status --short' "$doc" "$fixture"; then
  echo "final_rollup_hold_command_contamination=red"
  exit 1
fi

if grep -RInF 'zoso@' "$doc" "$fixture"; then
  echo "final_rollup_hold_prompt_contamination=red"
  exit 1
fi

echo "final_rollup_hold_contamination_absent=true"

grep -Fq "not activation release" "$doc"
grep -Fq "not activation enablement" "$doc"
grep -Fq "not automatic fulfillment enablement" "$doc"

echo "final_rollup_hold_no_signing=true"
echo "final_rollup_hold_no_signature=true"
echo "final_rollup_hold_no_private_key_access=true"
echo "final_rollup_hold_no_void_transfer=true"
echo "final_rollup_hold_no_transaction_broadcast=true"

echo "${marker}_GREEN"

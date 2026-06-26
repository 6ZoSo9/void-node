#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-complete-closeout-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_COMPLETE_CLOSEOUT_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "complete_closeout_hold_files_and_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-complete-closeout-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_COMPLETE_CLOSEOUT_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_complete_closeout_held"
assert j["scope"] == "private_operator_only_preflight_complete_closeout_hold_not_activation_not_release_not_execution"
assert j["precision_source_of_truth"] is True
assert j["preflight_complete_status"] == "activation_candidate_preflight_complete_held"
assert j["next_required_gate"] == "activation_candidate_preflight_status_rollup_hold_v1"

hold = j["closeout_hold"]
assert hold["closeout_state"] == "held_closed"
assert hold["preflight_complete_closeout_held"] is True
assert hold["preflight_complete_record_written"] is False
assert hold["preflight_closeout_record_written"] is False
assert hold["activation_candidate_finalized"] is False
assert hold["activation_ready"] is False
assert hold["activation_released"] is False
assert hold["activation_enabled"] is False
assert hold["automatic_fulfillment_enabled"] is False
assert hold["execution_performed"] is False
assert hold["signature_created"] is False
assert hold["void_transfer_performed"] is False
assert hold["transaction_broadcast_performed"] is False
assert hold["public_mutation_performed"] is False

chain = j["closeout_hold_chain"]
assert isinstance(chain, list)
assert len(chain) >= 18
assert chain[-1] == "preflight_complete_closeout_hold"

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
    "final_seal_hold",
    "preflight_complete_hold",
    "preflight_complete_closeout_hold",
]
for item in required_chain:
    assert item in chain, item

boundary = j["boundary"]

required_true = [
    "preflight_complete_closeout_hold",
    "preflight_complete_hold_complete",
    "final_seal_hold_complete",
    "final_rollup_hold_complete",
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
    "closeout_plan_only",
]
for k in required_true:
    assert boundary[k] is True, k

required_false = [
    "preflight_complete_record_written",
    "preflight_closeout_record_written",
    "activation_candidate_finalized",
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

print("complete_closeout_hold_fixture_green=true")
print("complete_closeout_hold_held_closed_green=true")
print("complete_closeout_hold_chain_green=true")
print("complete_closeout_hold_boundary_green=true")
print("complete_closeout_hold_no_preflight_complete_record=true")
print("complete_closeout_hold_no_preflight_closeout_record=true")
print("complete_closeout_hold_no_activation_finalized=true")
print("complete_closeout_hold_no_activation_release=true")
print("complete_closeout_hold_no_activation_enablement=true")
print("complete_closeout_hold_no_execution=true")
PY

if grep -RInF 'git status --short' "$doc" "$fixture"; then
  echo "complete_closeout_hold_command_contamination=red"
  exit 1
fi

if grep -RInF 'zoso@' "$doc" "$fixture"; then
  echo "complete_closeout_hold_prompt_contamination=red"
  exit 1
fi

echo "complete_closeout_hold_contamination_absent=true"

grep -Fq "not activation" "$doc"
grep -Fq "not activation release" "$doc"
grep -Fq "not execution" "$doc"
grep -Fq "not automatic fulfillment enablement" "$doc"

echo "complete_closeout_hold_no_signing=true"
echo "complete_closeout_hold_no_signature=true"
echo "complete_closeout_hold_no_private_key_access=true"
echo "complete_closeout_hold_no_void_transfer=true"
echo "complete_closeout_hold_no_transaction_broadcast=true"

echo "${marker}_GREEN"

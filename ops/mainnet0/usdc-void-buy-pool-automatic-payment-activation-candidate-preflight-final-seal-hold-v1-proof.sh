#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-final-seal-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FINAL_SEAL_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "final_seal_hold_files_and_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-final-seal-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FINAL_SEAL_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_final_seal_held"
assert j["scope"] == "private_operator_only_final_seal_hold_not_activation_not_release_not_execution"
assert j["precision_source_of_truth"] is True
assert j["final_rollup_status"] == "activation_candidate_preflight_final_rollup_held"
assert j["next_required_gate"] == "activation_candidate_preflight_complete_hold_v1"

seal = j["final_seal"]
assert seal["seal_state"] == "held_closed"
assert seal["preflight_chain_sealed_as_hold"] is True
assert seal["activation_candidate_finalized"] is False
assert seal["activation_ready"] is False
assert seal["activation_released"] is False
assert seal["activation_enabled"] is False
assert seal["automatic_fulfillment_enabled"] is False
assert seal["execution_performed"] is False
assert seal["signature_created"] is False
assert seal["void_transfer_performed"] is False
assert seal["transaction_broadcast_performed"] is False
assert seal["public_mutation_performed"] is False

chain = j["sealed_hold_chain"]
assert isinstance(chain, list)
assert len(chain) >= 16
assert chain[-1] == "final_seal_hold"

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
]
for item in required_chain:
    assert item in chain, item

boundary = j["boundary"]

required_true = [
    "final_seal_hold",
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
    "seal_plan_only",
]
for k in required_true:
    assert boundary[k] is True, k

required_false = [
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

print("final_seal_hold_fixture_green=true")
print("final_seal_held_closed_green=true")
print("final_seal_hold_chain_green=true")
print("final_seal_hold_boundary_green=true")
print("final_seal_hold_no_activation_finalized=true")
print("final_seal_hold_no_activation_release=true")
print("final_seal_hold_no_activation_enablement=true")
print("final_seal_hold_no_execution=true")
PY

if grep -RInF 'git status --short' "$doc" "$fixture"; then
  echo "final_seal_hold_command_contamination=red"
  exit 1
fi

if grep -RInF 'zoso@' "$doc" "$fixture"; then
  echo "final_seal_hold_prompt_contamination=red"
  exit 1
fi

echo "final_seal_hold_contamination_absent=true"

grep -Fq "not activation" "$doc"
grep -Fq "not activation release" "$doc"
grep -Fq "not execution" "$doc"
grep -Fq "not automatic fulfillment enablement" "$doc"

echo "final_seal_hold_no_signing=true"
echo "final_seal_hold_no_signature=true"
echo "final_seal_hold_no_private_key_access=true"
echo "final_seal_hold_no_void_transfer=true"
echo "final_seal_hold_no_transaction_broadcast=true"

echo "${marker}_GREEN"

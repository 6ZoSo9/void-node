#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-activation-prerequisite-gap-matrix-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_PREREQUISITE_GAP_MATRIX_HOLD_V1"
dependency_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DRY_RUN_CLOSEOUT_NON_ACTIVATION_BOUNDARY_HOLD_V1"

doc="docs/private/$name.md"
fixture="fixtures/private/$name.json"
proof="ops/mainnet0/$name-proof.sh"

dependency_doc="docs/private/usdc-void-buy-pool-automatic-payment-dry-run-closeout-non-activation-boundary-hold-v1.md"
dependency_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-dry-run-closeout-non-activation-boundary-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_PREREQUISITE_GAP_MATRIX_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_activation_prerequisite_gap_matrix_hold_files_exist=true"

test -f "$dependency_doc"
test -f "$dependency_fixture"
echo "automatic_payment_activation_prerequisite_gap_matrix_hold_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_activation_prerequisite_gap_matrix_hold_marker_green=true"

grep -Fq "$dependency_marker" "$doc"
grep -Fq "$dependency_marker" "$fixture"
grep -Fq "$dependency_marker" "$dependency_doc"
grep -Fq "$dependency_marker" "$dependency_fixture"
echo "automatic_payment_activation_prerequisite_gap_matrix_hold_dependency_marker_green=true"

if git grep -F "$marker" -- docs/public fixtures/public src >/tmp/void-activation-gap-matrix-public-leak.txt 2>/dev/null; then
  cat /tmp/void-activation-gap-matrix-public-leak.txt
  echo "automatic_payment_activation_prerequisite_gap_matrix_hold_no_public_or_src_leak=false"
  exit 1
else
  echo "automatic_payment_activation_prerequisite_gap_matrix_hold_no_public_or_src_leak=true"
fi

export fixture marker dependency_marker
python3 <<'PY'
import json
import os

fixture = os.environ["fixture"]
marker = os.environ["marker"]
dependency_marker = os.environ["dependency_marker"]

with open(fixture, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_activation_prerequisite_gap_matrix_hold_v1"
assert data["visibility"] == "private_operator_only"
assert data["status"] == "activation_prerequisite_gap_matrix_hold"
assert data["sealed_dependency"]["marker"] == dependency_marker
assert data["sealed_dependency"]["head"] == "10acf437"

for key, value in data["activation_status"].items():
    assert value is False, key

required_gates = data["remaining_required_gates"]
expected = [
    "explicit_operator_activation_artifact",
    "activation_proof_stack",
    "private_allocation_ledger_write_path_approval",
    "append_only_ledger_writer_proof",
    "allocation_claim_creation_proof",
    "inventory_reserve_decrement_proof",
    "signer_wallet_policy_proof",
    "fulfillment_execution_proof",
    "duplicate_payment_recheck_proof",
    "finality_live_receipt_verification_proof",
    "public_mutation_boundary_proof",
    "advisory_ai_no_write_proof",
    "two_box_green_verification",
    "final_precision_sync"
]
for key in expected:
    assert key in required_gates, key
    assert required_gates[key] is False, key

for section in ["authority", "public_surface"]:
    for key, value in data[section].items():
        assert value is False, f"{section}.{key}"

print("automatic_payment_activation_prerequisite_gap_matrix_hold_json_semantics_green=true")
PY

echo "automatic_payment_activation_prerequisite_gap_matrix_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_PREREQUISITE_GAP_MATRIX_HOLD_V1_GREEN"

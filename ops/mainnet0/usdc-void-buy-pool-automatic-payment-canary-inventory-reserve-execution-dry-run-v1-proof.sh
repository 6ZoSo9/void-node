#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-dry-run-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_DRY_RUN_V1"

doc="docs/private/$name.md"
dry_run="ops/mainnet0/$name.py"
policy_fixture="fixtures/private/$name-policy.example.json"

packet_hold="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-packet-hold-v1.py"
approval_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1.py"
approval_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1-approve.example.json"
preflight="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1.py"
preflight_policy="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1-policy.example.json"
allocation_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1.py"
review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"

valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"
approve_review_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$dry_run"
test -f "$policy_fixture"
test -f "$packet_hold"
test -f "$approval_gate"
test -f "$approval_fixture"
test -f "$preflight"
test -f "$preflight_policy"
test -f "$allocation_gate"
test -f "$review_gate"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
test -f "$approve_review_fixture"
echo "automatic_payment_canary_inventory_reserve_execution_dry_run_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$dry_run" >/dev/null
echo "automatic_payment_canary_inventory_reserve_execution_dry_run_marker_green=true"

bridge_out="$(mktemp)"
review_out="$(mktemp)"
allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
approval_out="$(mktemp)"
packet_out_file="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$review_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$review_out" python3 "$allocation_gate" > "$allocation_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$preflight_policy" python3 "$preflight" > "$preflight_out"
CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approval_fixture" python3 "$approval_gate" > "$approval_out"
CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$approval_out" python3 "$packet_hold" > "$packet_out_file"

dry_out="$(CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON="$packet_out_file" CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON="$policy_fixture" python3 "$dry_run")"
printf '%s\n' "$dry_out" > /tmp/void-canary-inventory-reserve-execution-dry-run.json

python3 - <<'PY'
import json
from pathlib import Path

d = json.loads(Path("/tmp/void-canary-inventory-reserve-execution-dry-run.json").read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_DRY_RUN_V1"
assert d["ok"] is True
assert d["dry_run"]["state"] == "inventory_reserve_execution_dry_run_ready"
assert d["dry_run"]["ready_for_separate_actual_execute_review"] is True

r = d["proposed_result"]
assert r["dry_run_result_kind"] == "automatic_payment_canary_inventory_reserve_execution_dry_run_result"
assert r["dry_run_result_status"] == "ready_for_separate_actual_execute_review"
assert r["requested_void_amount"] in ["2E+2", "200"]
assert r["inventory_remaining_before"] in ["2E+2", "200"]
assert r["inventory_remaining_after_if_executed"] == "0"
assert r["actual_inventory_mutation_performed"] is False
assert r["operator_actual_execute_required_after_dry_run"] is True

auth = d["authority"]
assert auth["dry_run_only"] is True
for k in [
    "inventory_reserved",
    "inventory_decremented",
    "allocation_record_created",
    "private_allocation_ledger_write",
    "fulfillment_executed",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
]:
    assert auth[k] is False, k

print("automatic_payment_canary_inventory_reserve_execution_dry_run_semantics_green=true")
PY

tmp_bad_policy="$(mktemp)"
cat > "$tmp_bad_policy" <<'JSON'
{
  "dry_run_policy_kind": "automatic_payment_canary_inventory_reserve_execution_dry_run_policy",
  "allow_actual_inventory_mutation": true,
  "allow_private_ledger_write": false,
  "allow_fulfillment_execution": false,
  "allow_wallet_signing": false,
  "allow_void_transfer": false,
  "expected_inventory_remaining_before": "200",
  "operator_actual_execute_required_after_dry_run": true
}
JSON

if CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON="$packet_out_file" CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON="$tmp_bad_policy" python3 "$dry_run" >/tmp/void-canary-inventory-reserve-execution-dry-run-bad-policy.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_execution_dry_run_bad_policy_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_execution_dry_run_bad_policy_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$dry_run" "$policy_fixture" && {
  echo "automatic_payment_canary_inventory_reserve_execution_dry_run_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_execution_dry_run_secret_leak_absent=true"

echo "${marker}_GREEN"

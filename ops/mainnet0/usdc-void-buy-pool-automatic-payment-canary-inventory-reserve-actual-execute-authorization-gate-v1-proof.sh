#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_GATE_V1"

doc="docs/private/$name.md"
gate="ops/mainnet0/$name.py"
authorize_fixture="fixtures/private/$name-authorize.example.json"
hold_fixture="fixtures/private/$name-hold.example.json"

dry_run="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-dry-run-v1.py"
dry_run_policy="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-dry-run-v1-policy.example.json"

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
test -f "$gate"
test -f "$authorize_fixture"
test -f "$hold_fixture"
test -f "$dry_run"
test -f "$dry_run_policy"
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
echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$gate" >/dev/null
echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_marker_green=true"

bridge_out="$(mktemp)"
review_out="$(mktemp)"
allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
approval_out="$(mktemp)"
packet_out="$(mktemp)"
dry_run_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$review_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$review_out" python3 "$allocation_gate" > "$allocation_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$preflight_policy" python3 "$preflight" > "$preflight_out"
CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approval_fixture" python3 "$approval_gate" > "$approval_out"
CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$approval_out" python3 "$packet_hold" > "$packet_out"
CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON="$packet_out" CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON="$dry_run_policy" python3 "$dry_run" > "$dry_run_out"

authorize_out="$(CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$authorize_fixture" python3 "$gate")"
hold_out="$(CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$hold_fixture" python3 "$gate")"

printf '%s\n' "$authorize_out" > /tmp/void-canary-inventory-reserve-actual-execute-authorize.json
printf '%s\n' "$hold_out" > /tmp/void-canary-inventory-reserve-actual-execute-hold.json

python3 - <<'PY'
import json
from pathlib import Path

authz = json.loads(Path("/tmp/void-canary-inventory-reserve-actual-execute-authorize.json").read_text())
hold = json.loads(Path("/tmp/void-canary-inventory-reserve-actual-execute-hold.json").read_text())

assert authz["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_GATE_V1"
assert authz["ok"] is True
assert authz["authorization"]["state"] == "authorized_for_separate_actual_inventory_reserve_execute"
assert authz["authorization"]["authorized_for_separate_actual_inventory_reserve_execute"] is True
assert authz["dry_run_result"]["dry_run_result_kind"] == "automatic_payment_canary_inventory_reserve_execution_dry_run_result"
assert authz["authority"]["actual_inventory_reserve_execute_authorized"] is True

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
    assert authz["authority"][k] is False, k

assert hold["ok"] is True
assert hold["authorization"]["state"] == "held_for_operator_review"
assert hold["authorization"]["authorized_for_separate_actual_inventory_reserve_execute"] is False
assert hold["authority"]["actual_inventory_reserve_execute_authorized"] is False
assert hold["authority"]["inventory_reserved"] is False
assert hold["authority"]["void_transfer"] is False

print("automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "operator_actual_execute_decision": "authorize_and_execute_now",
  "reviewer": "operator",
  "review_note": "bad decision"
}
JSON

if CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$tmp_bad" python3 "$gate" >/tmp/void-canary-inventory-reserve-actual-execute-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_bad_decision_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_bad_decision_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$gate" "$authorize_fixture" "$hold_fixture" && {
  echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_actual_execute_authorization_gate_secret_leak_absent=true"

echo "${marker}_GREEN"

#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_GATE_V1"

doc="docs/private/$name.md"
gate="ops/mainnet0/$name.py"
approve_fixture="fixtures/private/$name-approve.example.json"
hold_fixture="fixtures/private/$name-hold.example.json"

preflight="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1.py"
policy_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1-policy.example.json"

allocation_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1.py"
review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"

valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"
approve_review_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"
hold_review_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-hold.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$gate"
test -f "$approve_fixture"
test -f "$hold_fixture"
test -f "$preflight"
test -f "$policy_fixture"
test -f "$allocation_gate"
test -f "$review_gate"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
test -f "$approve_review_fixture"
test -f "$hold_review_fixture"
echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$gate" >/dev/null
echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_marker_green=true"

bridge_out="$(mktemp)"
approved_review="$(mktemp)"
held_review="$(mktemp)"
allocation_out="$(mktemp)"
blocked_allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
blocked_preflight_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"

CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$approved_review"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$hold_review_fixture" python3 "$review_gate" > "$held_review"

CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$approved_review" python3 "$allocation_gate" > "$allocation_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$held_review" python3 "$allocation_gate" > "$blocked_allocation_out"

CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$policy_fixture" python3 "$preflight" > "$preflight_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$blocked_allocation_out" CANARY_INVENTORY_POLICY_JSON="$policy_fixture" python3 "$preflight" > "$blocked_preflight_out"

approve_out="$(CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approve_fixture" python3 "$gate")"
hold_out="$(CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$hold_fixture" python3 "$gate")"
blocked_out="$(CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$blocked_preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approve_fixture" python3 "$gate")"

printf '%s\n' "$approve_out" > /tmp/void-canary-inventory-reserve-operator-approve.json
printf '%s\n' "$hold_out" > /tmp/void-canary-inventory-reserve-operator-hold.json
printf '%s\n' "$blocked_out" > /tmp/void-canary-inventory-reserve-operator-blocked.json

python3 - <<'PY'
import json
from pathlib import Path

approve = json.loads(Path("/tmp/void-canary-inventory-reserve-operator-approve.json").read_text())
hold = json.loads(Path("/tmp/void-canary-inventory-reserve-operator-hold.json").read_text())
blocked = json.loads(Path("/tmp/void-canary-inventory-reserve-operator-blocked.json").read_text())

assert approve["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_GATE_V1"
assert approve["ok"] is True
assert approve["operator_approval"]["state"] == "approved_for_separate_inventory_reserve_execution_packet"
assert approve["operator_approval"]["approved_for_separate_inventory_reserve_execution_packet"] is True
assert approve["inventory_reserve_candidate"]["inventory_reserve_candidate_kind"] == "automatic_payment_canary_inventory_reserve_candidate"
assert approve["authority"]["inventory_reserve_execution_packet_approved"] is True

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
    assert approve["authority"][k] is False, k

assert hold["ok"] is True
assert hold["operator_approval"]["state"] == "held_for_operator_review"
assert hold["operator_approval"]["approved_for_separate_inventory_reserve_execution_packet"] is False
assert hold["authority"]["inventory_reserve_execution_packet_approved"] is False
assert hold["authority"]["inventory_reserved"] is False
assert hold["authority"]["void_transfer"] is False

assert blocked["ok"] is True
assert blocked["operator_approval"]["state"] == "blocked_preflight_not_eligible"
assert blocked["operator_approval"]["approved_for_separate_inventory_reserve_execution_packet"] is False
assert blocked["inventory_reserve_candidate"] is None
assert blocked["authority"]["inventory_reserve_execution_packet_approved"] is False
assert blocked["authority"]["inventory_reserved"] is False
assert blocked["authority"]["void_transfer"] is False

print("automatic_payment_canary_inventory_reserve_operator_approval_gate_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "operator_inventory_reserve_decision": "approve_and_reserve_now",
  "reviewer": "operator",
  "review_note": "bad decision"
}
JSON

if CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$tmp_bad" python3 "$gate" >/tmp/void-canary-inventory-reserve-operator-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_bad_decision_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_bad_decision_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$gate" "$approve_fixture" "$hold_fixture" && {
  echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_operator_approval_gate_secret_leak_absent=true"

echo "${marker}_GREEN"

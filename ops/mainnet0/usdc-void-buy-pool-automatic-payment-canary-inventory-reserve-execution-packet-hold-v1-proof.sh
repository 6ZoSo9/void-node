#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-packet-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_HOLD_V1"

doc="docs/private/$name.md"
packet_hold="ops/mainnet0/$name.py"

approval_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1.py"
approval_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1-approve.example.json"
hold_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1-hold.example.json"

preflight="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1.py"
policy_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1-policy.example.json"

allocation_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1.py"
review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"

valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"
approve_review_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$packet_hold"
test -f "$approval_gate"
test -f "$approval_fixture"
test -f "$hold_fixture"
test -f "$preflight"
test -f "$policy_fixture"
test -f "$allocation_gate"
test -f "$review_gate"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
test -f "$approve_review_fixture"
echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$packet_hold" >/dev/null
echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_marker_green=true"

bridge_out="$(mktemp)"
review_out="$(mktemp)"
allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
approval_out="$(mktemp)"
held_approval_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$review_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$review_out" python3 "$allocation_gate" > "$allocation_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$policy_fixture" python3 "$preflight" > "$preflight_out"

CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approval_fixture" python3 "$approval_gate" > "$approval_out"
CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$hold_fixture" python3 "$approval_gate" > "$held_approval_out"

packet_out="$(CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$approval_out" python3 "$packet_hold")"
blocked_out="$(CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$held_approval_out" python3 "$packet_hold")"

printf '%s\n' "$packet_out" > /tmp/void-canary-inventory-reserve-execution-packet.json
printf '%s\n' "$blocked_out" > /tmp/void-canary-inventory-reserve-execution-packet-blocked.json

python3 - <<'PY'
import json
from pathlib import Path

packet = json.loads(Path("/tmp/void-canary-inventory-reserve-execution-packet.json").read_text())
blocked = json.loads(Path("/tmp/void-canary-inventory-reserve-execution-packet-blocked.json").read_text())

assert packet["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_HOLD_V1"
assert packet["ok"] is True
assert packet["hold"]["state"] == "reserve_execution_packet_shape_ready"
assert packet["hold"]["reserve_execution_packet_shape_created"] is True

p = packet["reserve_execution_packet"]
assert p["reserve_execution_packet_kind"] == "automatic_payment_canary_inventory_reserve_execution_packet"
assert p["reserve_execution_packet_status"] == "held_shape_only_pending_separate_execute"
assert p["source_inventory_reserve_candidate_kind"] == "automatic_payment_canary_inventory_reserve_candidate"
assert p["requested_void_amount"] in ["2E+2", "200"]

b = p["execute_boundary"]
assert b["separate_operator_execute_required"] is True
assert b["this_packet_executes_now"] is False
assert b["inventory_reserved_now"] is False
assert b["inventory_decremented_now"] is False
assert b["ledger_written_now"] is False
assert b["fulfillment_executed_now"] is False
assert b["wallet_signing_now"] is False
assert b["void_transfer_now"] is False

auth = packet["authority"]
assert auth["reserve_execution_packet_shape_created"] is True
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

assert blocked["ok"] is True
assert blocked["hold"]["state"] == "blocked_operator_approval_not_approved"
assert blocked["hold"]["reserve_execution_packet_shape_created"] is False
assert blocked["reserve_execution_packet"] is None
assert blocked["authority"]["reserve_execution_packet_shape_created"] is False
assert blocked["authority"]["inventory_reserved"] is False
assert blocked["authority"]["void_transfer"] is False

print("automatic_payment_canary_inventory_reserve_execution_packet_hold_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_GATE_V1",
  "ok": true,
  "operator_approval": {
    "state": "approved_for_separate_inventory_reserve_execution_packet",
    "approved_for_separate_inventory_reserve_execution_packet": true
  },
  "inventory_reserve_candidate": {
    "inventory_reserve_candidate_kind": "wrong_kind",
    "inventory_reserve_candidate_status": "eligible_pending_operator_actual_reserve"
  }
}
JSON

if CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$tmp_bad" python3 "$packet_hold" >/tmp/void-canary-inventory-reserve-execution-packet-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_bad_kind_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_bad_kind_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$packet_hold" && {
  echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_execution_packet_hold_secret_leak_absent=true"

echo "${marker}_GREEN"

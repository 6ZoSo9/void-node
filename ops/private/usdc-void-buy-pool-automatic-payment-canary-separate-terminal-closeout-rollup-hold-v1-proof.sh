#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-rollup-hold-v1
doc="docs/private/$n.md"
rollup_fixture="fixtures/private/$n-rollup.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-execute-run-closeout-hold-v1
source_proof="ops/private/$source_n-proof.sh"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1"
source_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_CLOSEOUT_HOLD_V1"
allocation_record_hash="4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$rollup_fixture"
test -f "$hold_fixture"
test -f "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$rollup_fixture"
grep -q "$marker" "$hold_fixture"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_marker_green=true"

python3 - "$rollup_fixture" "$hold_fixture" "$marker" "$source_marker" "$allocation_record_hash" <<'PY'
import json
import sys

rollup_path, hold_path, marker, source_marker, allocation_record_hash = sys.argv[1:]

with open(rollup_path, "r", encoding="utf-8") as f:
    rollup = json.load(f)

with open(hold_path, "r", encoding="utf-8") as f:
    hold = json.load(f)

assert rollup["marker"] == marker
assert hold["marker"] == marker
assert rollup["source_terminal_execute_run_closeout_marker"] == source_marker
assert hold["source_terminal_execute_run_closeout_marker"] == source_marker
assert rollup["allocation_record_hash"] == allocation_record_hash
assert hold["allocation_record_hash"] == allocation_record_hash

assert rollup["rollup_state"] == "canary_separate_terminal_lane_closed_without_execution"
assert rollup["terminal_execute_run_closeout_state"] == "terminal_execute_run_closed_without_execution"
assert rollup["closed_without_execution"] is True
assert rollup["fulfilled_state"] is False
assert hold["hold_state"] == "terminal_closeout_rollup_hold"
assert hold["rollup_ready"] is True
assert hold["closed_without_execution"] is True

required = [
    "fulfillment_lane_preflight",
    "fulfillment_packet_hold",
    "fulfillment_operator_approval_gate",
    "fulfillment_execution_authorization_hold",
    "transfer_instruction_hold",
    "signer_authorization_hold",
    "operator_execute_hold",
    "actual_execute_gate_hold",
    "real_actual_execute_decision_hold",
    "real_actual_execute_packet_hold",
    "terminal_execute_run_hold",
    "terminal_execute_run_closeout_hold",
]
assert rollup["source_chain"] == required

for key, value in rollup["authority"].items():
    assert value is False, key

for key, value in hold["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_source_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_rollup_state_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_hold_state_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_source_chain_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_authority_boundary_green=true"
echo "allocation_record_hash=$allocation_record_hash"

echo
echo "== source terminal execute run closeout proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_source_closeout_green=true"

if grep -RInE '(private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$rollup_fixture" "$hold_fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_secret_assignment_leak_absent=true"

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" "$rollup_fixture" "$hold_fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_raw_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_raw_key_like_hex_absent=true"

public_paths=()
for p in src docs/public fixtures/public public; do
  if [ -e "$p" ]; then
    public_paths+=("$p")
  fi
done

if [ "${#public_paths[@]}" -gt 0 ]; then
  if grep -RIn "$marker" "${public_paths[@]}" 2>/dev/null; then
    echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_public_leak_absent=false"
    exit 1
  fi
fi
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_public_leak_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_public_mutation=true"
echo "automatic_payment_canary_separate_terminal_closeout_rollup_hold_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"

#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-quick-command-smoke-receipt-v1.md"
target_tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"

echo "=== VOID DataNet Core Peer Pin Current State Capsule Quick Command Smoke Receipt v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -x "$target_tool"
bash -n "$target_tool"

required_doc_lines=(
  'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_DOC_V1'
  'datanet_core_peer_pin_current_state_capsule_quick_command_smoke_receipt_created_now=true'
  'quick_command_smoke_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh'
  'quick_command_smoke_target_tool_present=true'
  'quick_command_smoke_runs_target_tool_once=true'
  'quick_command_smoke_runs_full_proof_chain=false'
  'quick_command_smoke_runs_full_live_rollup=false'
  'quick_command_smoke_reveals_exact_command=false'
  'quick_command_smoke_prints_exact_command=false'
  'quick_command_smoke_discloses_command_string=false'
  'quick_command_smoke_executes_terminal_action=false'
  'quick_command_smoke_mirrors_content=false'
  'quick_command_smoke_pins_content=false'
  'quick_command_smoke_public_mutation=false'
  'quick_command_smoke_ledger_write=false'
  'quick_command_smoke_wc_credit_award=false'
  'quick_command_smoke_terminal_safe=true'
  'quick_command_smoke_output_marker_required=VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN'
  'peer_pin_current_decision=continue_hold'
  'current_state_capsule_head=2cc26058'
  'current_state_capsule_public_pointer_head=710e79bd'
  'quick_command_packet_head=d6ca5538'
)

for line in "${required_doc_lines[@]}"; do
  grep -q "$line" "$doc"
done

smoke_out="/tmp/void-datanet-core-peer-pin-current-state-capsule-quick-command-smoke-$(date -u +%Y%m%d-%H%M%S).log"
timeout 30s bash "$target_tool" > "$smoke_out" 2>&1

grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN' "$smoke_out"
grep -q 'datanet_core_peer_pin_current_state_capsule_created_now=true' "$smoke_out"
grep -q 'current_state_capsule_terminal_safe=true' "$smoke_out"
grep -q 'current_state_capsule_runs_full_proof_chain=false' "$smoke_out"
grep -q 'current_state_capsule_runs_full_live_rollup=false' "$smoke_out"
grep -q 'focused_proof_index_head=2ada51df' "$smoke_out"
grep -q 'focused_proof_index_cross_box_green=true' "$smoke_out"
grep -q 'focused_static_guard_proof_path_indexed_now=true' "$smoke_out"
grep -q 'full_live_status_rollup_execution_required_for_this_lane_now=false' "$smoke_out"
grep -q 'focused_static_guard_proof_required_for_this_lane_now=true' "$smoke_out"
grep -q 'focused_static_guard_proof_accepted_for_this_lane_now=true' "$smoke_out"
grep -q 'peer_pin_current_decision=continue_hold' "$smoke_out"
grep -q 'exact_command_reveal_allowed_now=false' "$smoke_out"
grep -q 'exact_command_revealed_now=false' "$smoke_out"
grep -q 'exact_command_printed_now=false' "$smoke_out"
grep -q 'command_string_disclosed=false' "$smoke_out"
grep -q 'final_execute_allowed_now=false' "$smoke_out"
grep -q 'terminal_execute_allowed_now=false' "$smoke_out"
grep -q 'command_executed_now=false' "$smoke_out"
grep -q 'mirror_executed_now=false' "$smoke_out"
grep -q 'pin_executed_now=false' "$smoke_out"
grep -q 'public_mutation=false' "$smoke_out"
grep -q 'ledger_write=false' "$smoke_out"
grep -q 'wc_credit_award=false' "$smoke_out"
grep -q 'current_state_capsule_adds_authority=false' "$smoke_out"

echo "datanet_core_peer_pin_current_state_capsule_quick_command_smoke_receipt_created_now=true"
echo "quick_command_smoke_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"
echo "quick_command_smoke_target_tool_present=true"
echo "quick_command_smoke_runs_target_tool_once=true"
echo "quick_command_smoke_runs_full_proof_chain=false"
echo "quick_command_smoke_runs_full_live_rollup=false"
echo "quick_command_smoke_reveals_exact_command=false"
echo "quick_command_smoke_prints_exact_command=false"
echo "quick_command_smoke_discloses_command_string=false"
echo "quick_command_smoke_executes_terminal_action=false"
echo "quick_command_smoke_mirrors_content=false"
echo "quick_command_smoke_pins_content=false"
echo "quick_command_smoke_public_mutation=false"
echo "quick_command_smoke_ledger_write=false"
echo "quick_command_smoke_wc_credit_award=false"
echo "quick_command_smoke_terminal_safe=true"
echo "quick_command_smoke_output_marker_observed=VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN"
echo "peer_pin_current_decision=continue_hold"
echo "current_state_capsule_head=2cc26058"
echo "current_state_capsule_public_pointer_head=710e79bd"
echo "quick_command_packet_head=d6ca5538"
echo "current_state_capsule_quick_command_smoke_receipt_adds_authority=false"
echo "quick_command_smoke_receipt_proof_scope=runs_safe_capsule_command_once_no_full_rollup_no_chain_execution"
echo "quick_command_smoke_out=$smoke_out"
echo "VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_PROOF_V1_GREEN"

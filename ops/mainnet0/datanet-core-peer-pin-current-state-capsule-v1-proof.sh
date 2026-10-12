#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-v1.md"
tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"

echo "=== VOID DataNet Core Peer Pin Current State Capsule v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -x "$tool"

bash -n "$tool"

required_doc_lines=(
  'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_DOC_V1'
  'datanet_core_peer_pin_current_state_capsule_created_now=true'
  'current_state_capsule_terminal_safe=true'
  'current_state_capsule_runs_full_proof_chain=false'
  'current_state_capsule_runs_full_live_rollup=false'
  'focused_proof_index_head=2ada51df'
  'focused_proof_index_cross_box_green=true'
  'focused_static_guard_proof_path_indexed_now=true'
  'full_live_status_rollup_execution_required_for_this_lane_now=false'
  'focused_static_guard_proof_required_for_this_lane_now=true'
  'focused_static_guard_proof_accepted_for_this_lane_now=true'
  'peer_pin_current_decision=continue_hold'
  'exact_command_reveal_allowed_now=false'
  'exact_command_revealed_now=false'
  'exact_command_printed_now=false'
  'command_string_disclosed=false'
  'final_execute_allowed_now=false'
  'terminal_execute_allowed_now=false'
  'command_executed_now=false'
  'mirror_executed_now=false'
  'pin_executed_now=false'
  'public_mutation=false'
  'ledger_write=false'
  'wc_credit_award=false'
)

for line in "${required_doc_lines[@]}"; do
  grep -q "$line" "$doc"
done

tool_out="/tmp/void-datanet-core-peer-pin-current-state-capsule-tool-proof-$(date -u +%Y%m%d-%H%M%S).log"
"$tool" > "$tool_out" 2>&1

required_tool_lines=(
  'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN'
  'datanet_core_peer_pin_current_state_capsule_created_now=true'
  'current_state_capsule_terminal_safe=true'
  'current_state_capsule_runs_full_proof_chain=false'
  'current_state_capsule_runs_full_live_rollup=false'
  'focused_proof_index_head=2ada51df'
  'focused_proof_index_cross_box_green=true'
  'focused_proof_index_cross_box_tag=ckpt-datanet-core-peer-pin-focused-proof-index-v1-cross-box-green-20260617-213704'
  'focused_static_guard_proof_path_indexed_now=true'
  'full_live_status_rollup_execution_required_for_this_lane_now=false'
  'focused_static_guard_proof_required_for_this_lane_now=true'
  'focused_static_guard_proof_accepted_for_this_lane_now=true'
  'peer_pin_current_decision=continue_hold'
  'exact_command_reveal_allowed_now=false'
  'exact_command_revealed_now=false'
  'exact_command_printed_now=false'
  'command_string_disclosed=false'
  'final_execute_allowed_now=false'
  'terminal_execute_allowed_now=false'
  'command_executed_now=false'
  'mirror_executed_now=false'
  'pin_executed_now=false'
  'public_mutation=false'
  'ledger_write=false'
  'wc_credit_award=false'
  'current_state_capsule_adds_authority=false'
)

for line in "${required_tool_lines[@]}"; do
  grep -q "$line" "$tool_out"
done

echo "datanet_core_peer_pin_current_state_capsule_created_now=true"
echo "current_state_capsule_terminal_safe=true"
echo "current_state_capsule_runs_full_proof_chain=false"
echo "current_state_capsule_runs_full_live_rollup=false"
echo "focused_proof_index_head=2ada51df"
echo "focused_proof_index_cross_box_green=true"
echo "focused_static_guard_proof_path_indexed_now=true"
echo "full_live_status_rollup_execution_required_for_this_lane_now=false"
echo "focused_static_guard_proof_required_for_this_lane_now=true"
echo "focused_static_guard_proof_accepted_for_this_lane_now=true"
echo "peer_pin_current_decision=continue_hold"
echo "exact_command_reveal_allowed_now=false"
echo "exact_command_revealed_now=false"
echo "exact_command_printed_now=false"
echo "command_string_disclosed=false"
echo "final_execute_allowed_now=false"
echo "terminal_execute_allowed_now=false"
echo "command_executed_now=false"
echo "mirror_executed_now=false"
echo "pin_executed_now=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "current_state_capsule_adds_authority=false"
echo "current_state_capsule_proof_scope=tiny_static_capsule_no_full_rollup_no_chain_execution"
echo "current_state_capsule_tool_out=$tool_out"
echo "VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1_GREEN"

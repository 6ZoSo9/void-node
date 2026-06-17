#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-quick-command-packet-v1.md"
target_tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"

echo "=== VOID DataNet Core Peer Pin Current State Capsule Quick Command Packet v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -x "$target_tool"
bash -n "$target_tool"

required_doc_lines=(
  'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_DOC_V1'
  'datanet_core_peer_pin_current_state_capsule_quick_command_packet_created_now=true'
  'quick_command_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh'
  'quick_command_target_tool_present=true'
  'quick_command_target_tool_cross_box_green=true'
  'quick_command_terminal_safe=true'
  'quick_command_runs_full_proof_chain=false'
  'quick_command_runs_full_live_rollup=false'
  'quick_command_reveals_exact_command=false'
  'quick_command_prints_exact_command=false'
  'quick_command_discloses_command_string=false'
  'quick_command_executes_terminal_action=false'
  'quick_command_mirrors_content=false'
  'quick_command_pins_content=false'
  'quick_command_public_mutation=false'
  'quick_command_ledger_write=false'
  'quick_command_wc_credit_award=false'
  'peer_pin_current_decision=continue_hold'
  'current_state_capsule_head=2cc26058'
  'current_state_capsule_public_pointer_head=710e79bd'
)

for line in "${required_doc_lines[@]}"; do
  grep -q "$line" "$doc"
done

grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1' "$target_tool"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN' "$target_tool"
grep -q 'current_state_capsule_terminal_safe=true' "$target_tool"
grep -q 'current_state_capsule_runs_full_proof_chain=false' "$target_tool"
grep -q 'current_state_capsule_runs_full_live_rollup=false' "$target_tool"
grep -q 'peer_pin_current_decision=continue_hold' "$target_tool"
grep -q 'current_state_capsule_adds_authority=false' "$target_tool"
grep -q 'exact_command_revealed_now=false' "$target_tool"
grep -q 'command_string_disclosed=false' "$target_tool"
grep -q 'command_executed_now=false' "$target_tool"
grep -q 'mirror_executed_now=false' "$target_tool"
grep -q 'pin_executed_now=false' "$target_tool"
grep -q 'public_mutation=false' "$target_tool"
grep -q 'ledger_write=false' "$target_tool"
grep -q 'wc_credit_award=false' "$target_tool"

echo "datanet_core_peer_pin_current_state_capsule_quick_command_packet_created_now=true"
echo "quick_command_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"
echo "quick_command_target_tool_present=true"
echo "quick_command_target_tool_cross_box_green=true"
echo "quick_command_terminal_safe=true"
echo "quick_command_runs_full_proof_chain=false"
echo "quick_command_runs_full_live_rollup=false"
echo "quick_command_reveals_exact_command=false"
echo "quick_command_prints_exact_command=false"
echo "quick_command_discloses_command_string=false"
echo "quick_command_executes_terminal_action=false"
echo "quick_command_mirrors_content=false"
echo "quick_command_pins_content=false"
echo "quick_command_public_mutation=false"
echo "quick_command_ledger_write=false"
echo "quick_command_wc_credit_award=false"
echo "peer_pin_current_decision=continue_hold"
echo "current_state_capsule_head=2cc26058"
echo "current_state_capsule_public_pointer_head=710e79bd"
echo "current_state_capsule_quick_command_packet_adds_authority=false"
echo "quick_command_packet_proof_scope=static_packet_no_quick_command_execution_no_full_rollup_no_chain_execution"
echo "VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_PROOF_V1_GREEN"

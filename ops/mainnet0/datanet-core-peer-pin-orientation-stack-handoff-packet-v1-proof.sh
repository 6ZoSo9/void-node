#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_HANDOFF_PACKET_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-orientation-stack-handoff-packet-v1.md"
orientation_index_doc="docs/public/public-node-datanet-core-peer-pin-orientation-stack-index-v1.md"
orientation_index_proof="ops/mainnet0/datanet-core-peer-pin-orientation-stack-index-v1-proof.sh"
current_capsule_tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"

echo "=== VOID DataNet Core Peer Pin Orientation Stack Handoff Packet v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -f "$orientation_index_doc"
test -x "$orientation_index_proof"
test -x "$current_capsule_tool"

bash -n "$orientation_index_proof"
bash -n "$current_capsule_tool"

required_doc_lines=(
  'VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_HANDOFF_PACKET_DOC_V1'
  'datanet_core_peer_pin_orientation_stack_handoff_packet_created_now=true'
  'orientation_stack_handoff_packet_terminal_safe=true'
  'orientation_stack_handoff_packet_safe_start_point=docs/public/public-node-datanet-core-peer-pin-orientation-stack-index-v1.md'
  'orientation_stack_handoff_packet_safe_quick_command=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh'
  'orientation_stack_handoff_packet_runs_current_state_capsule=false'
  'orientation_stack_handoff_packet_runs_smoke_receipt=false'
  'orientation_stack_handoff_packet_runs_full_proof_chain=false'
  'orientation_stack_handoff_packet_runs_full_live_rollup=false'
  'orientation_stack_handoff_packet_orientation_stack_index_head=19a357ae'
  'orientation_stack_handoff_packet_all_stack_cross_box_green=true'
  'orientation_stack_handoff_packet_restart_order_recorded=true'
  'orientation_stack_handoff_packet_future_operator_safe=true'
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

grep -q 'VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_DOC_V1' "$orientation_index_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_PROOF_V1_GREEN' "$orientation_index_proof"
grep -q 'orientation_stack_index_safe_start_point=true' "$orientation_index_doc"
grep -q 'orientation_stack_index_all_cross_box_green=true' "$orientation_index_doc"
grep -q 'orientation_stack_index_runs_current_state_capsule=false' "$orientation_index_doc"
grep -q 'orientation_stack_index_runs_smoke_receipt=false' "$orientation_index_doc"
grep -q 'orientation_stack_index_runs_full_proof_chain=false' "$orientation_index_doc"
grep -q 'orientation_stack_index_runs_full_live_rollup=false' "$orientation_index_doc"
grep -q 'orientation_stack_index_adds_authority=false' "$orientation_index_proof"

grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN' "$current_capsule_tool"
grep -q 'current_state_capsule_terminal_safe=true' "$current_capsule_tool"
grep -q 'peer_pin_current_decision=continue_hold' "$current_capsule_tool"
grep -q 'current_state_capsule_adds_authority=false' "$current_capsule_tool"

echo "datanet_core_peer_pin_orientation_stack_handoff_packet_created_now=true"
echo "orientation_stack_handoff_packet_terminal_safe=true"
echo "orientation_stack_handoff_packet_safe_start_point=docs/public/public-node-datanet-core-peer-pin-orientation-stack-index-v1.md"
echo "orientation_stack_handoff_packet_safe_quick_command=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"
echo "orientation_stack_handoff_packet_runs_current_state_capsule=false"
echo "orientation_stack_handoff_packet_runs_smoke_receipt=false"
echo "orientation_stack_handoff_packet_runs_full_proof_chain=false"
echo "orientation_stack_handoff_packet_runs_full_live_rollup=false"
echo "orientation_stack_handoff_packet_orientation_stack_index_head=19a357ae"
echo "orientation_stack_handoff_packet_all_stack_cross_box_green=true"
echo "orientation_stack_handoff_packet_restart_order_recorded=true"
echo "orientation_stack_handoff_packet_future_operator_safe=true"
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
echo "orientation_stack_handoff_packet_adds_authority=false"
echo "orientation_stack_handoff_packet_proof_scope=static_handoff_no_capsule_execution_no_smoke_receipt_execution_no_full_rollup_no_chain_execution"
echo "VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_HANDOFF_PACKET_PROOF_V1_GREEN"

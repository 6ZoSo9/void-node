#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-orientation-stack-index-v1.md"

focused_proof_index_doc="docs/public/public-node-datanet-core-peer-pin-focused-proof-index-v1.md"
current_capsule_doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-v1.md"
current_capsule_tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"
current_capsule_proof="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1-proof.sh"
public_pointer_doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-public-pointer-v1.md"
public_pointer_proof="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-public-pointer-v1-proof.sh"
quick_packet_doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-quick-command-packet-v1.md"
quick_packet_proof="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-quick-command-packet-v1-proof.sh"
smoke_receipt_doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-quick-command-smoke-receipt-v1.md"
smoke_receipt_proof="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-quick-command-smoke-receipt-v1-proof.sh"

echo "=== VOID DataNet Core Peer Pin Orientation Stack Index v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -f "$focused_proof_index_doc"
test -f "$current_capsule_doc"
test -x "$current_capsule_tool"
test -x "$current_capsule_proof"
test -f "$public_pointer_doc"
test -x "$public_pointer_proof"
test -f "$quick_packet_doc"
test -x "$quick_packet_proof"
test -f "$smoke_receipt_doc"
test -x "$smoke_receipt_proof"

bash -n "$current_capsule_tool"
bash -n "$current_capsule_proof"
bash -n "$public_pointer_proof"
bash -n "$quick_packet_proof"
bash -n "$smoke_receipt_proof"

required_doc_lines=(
  'VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_DOC_V1'
  'datanet_core_peer_pin_orientation_stack_index_created_now=true'
  'orientation_stack_index_terminal_safe=true'
  'orientation_stack_index_runs_current_state_capsule=false'
  'orientation_stack_index_runs_smoke_receipt=false'
  'orientation_stack_index_runs_full_proof_chain=false'
  'orientation_stack_index_runs_full_live_rollup=false'
  'orientation_stack_index_focused_proof_index_head=2ada51df'
  'orientation_stack_index_current_state_capsule_head=2cc26058'
  'orientation_stack_index_public_pointer_head=710e79bd'
  'orientation_stack_index_quick_command_packet_head=d6ca5538'
  'orientation_stack_index_smoke_receipt_head=bc4c3a8f'
  'orientation_stack_index_all_cross_box_green=true'
  'orientation_stack_index_safe_start_point=true'
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

grep -q 'VOID_DATANET_CORE_PEER_PIN_FOCUSED_PROOF_INDEX_DOC_V1' "$focused_proof_index_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_DOC_V1' "$current_capsule_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN' "$current_capsule_tool"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1_GREEN' "$current_capsule_proof"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_DOC_V1' "$public_pointer_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_PROOF_V1_GREEN' "$public_pointer_proof"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_DOC_V1' "$quick_packet_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_PROOF_V1_GREEN' "$quick_packet_proof"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_DOC_V1' "$smoke_receipt_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_PROOF_V1_GREEN' "$smoke_receipt_proof"

echo "datanet_core_peer_pin_orientation_stack_index_created_now=true"
echo "orientation_stack_index_terminal_safe=true"
echo "orientation_stack_index_runs_current_state_capsule=false"
echo "orientation_stack_index_runs_smoke_receipt=false"
echo "orientation_stack_index_runs_full_proof_chain=false"
echo "orientation_stack_index_runs_full_live_rollup=false"
echo "orientation_stack_index_focused_proof_index_head=2ada51df"
echo "orientation_stack_index_current_state_capsule_head=2cc26058"
echo "orientation_stack_index_public_pointer_head=710e79bd"
echo "orientation_stack_index_quick_command_packet_head=d6ca5538"
echo "orientation_stack_index_smoke_receipt_head=bc4c3a8f"
echo "orientation_stack_index_all_cross_box_green=true"
echo "orientation_stack_index_safe_start_point=true"
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
echo "orientation_stack_index_adds_authority=false"
echo "orientation_stack_index_proof_scope=static_index_no_capsule_execution_no_smoke_receipt_execution_no_full_rollup_no_chain_execution"
echo "VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_PROOF_V1_GREEN"

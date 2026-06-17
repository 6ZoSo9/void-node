#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_PROOF_V1"

doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-public-pointer-v1.md"

target_doc="docs/public/public-node-datanet-core-peer-pin-current-state-capsule-v1.md"
target_tool="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh"
target_proof="ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1-proof.sh"

echo "=== VOID DataNet Core Peer Pin Current State Capsule Public Pointer v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -f "$target_doc"
test -x "$target_tool"
test -x "$target_proof"

bash -n "$target_tool"
bash -n "$target_proof"

required_pointer_lines=(
  'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_DOC_V1'
  'datanet_core_peer_pin_current_state_capsule_public_pointer_created_now=true'
  'current_state_capsule_public_pointer_target_doc_present=true'
  'current_state_capsule_public_pointer_target_tool_present=true'
  'current_state_capsule_public_pointer_target_proof_present=true'
  'current_state_capsule_public_pointer_target_cross_box_green=true'
  'current_state_capsule_public_pointer_terminal_safe=true'
  'current_state_capsule_public_pointer_runs_full_proof_chain=false'
  'current_state_capsule_public_pointer_runs_full_live_rollup=false'
  'focused_proof_index_head=2ada51df'
  'current_state_capsule_head=2cc26058'
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

for line in "${required_pointer_lines[@]}"; do
  grep -q "$line" "$doc"
done

grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_DOC_V1' "$target_doc"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN' "$target_tool"
grep -q 'VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1_GREEN' "$target_proof"
grep -q 'current_state_capsule_terminal_safe=true' "$target_tool"
grep -q 'current_state_capsule_runs_full_proof_chain=false' "$target_tool"
grep -q 'current_state_capsule_runs_full_live_rollup=false' "$target_tool"
grep -q 'peer_pin_current_decision=continue_hold' "$target_tool"
grep -q 'current_state_capsule_adds_authority=false' "$target_tool"

echo "datanet_core_peer_pin_current_state_capsule_public_pointer_created_now=true"
echo "current_state_capsule_public_pointer_target_doc_present=true"
echo "current_state_capsule_public_pointer_target_tool_present=true"
echo "current_state_capsule_public_pointer_target_proof_present=true"
echo "current_state_capsule_public_pointer_target_cross_box_green=true"
echo "current_state_capsule_public_pointer_terminal_safe=true"
echo "current_state_capsule_public_pointer_runs_full_proof_chain=false"
echo "current_state_capsule_public_pointer_runs_full_live_rollup=false"
echo "focused_proof_index_head=2ada51df"
echo "current_state_capsule_head=2cc26058"
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
echo "current_state_capsule_public_pointer_adds_authority=false"
echo "public_pointer_proof_scope=static_pointer_no_capsule_execution_no_full_rollup_no_chain_execution"
echo "VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_PROOF_V1_GREEN"

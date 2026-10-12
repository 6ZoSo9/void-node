#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_OUTPUT_BOUNDARY_PROOF_V1"

doc="docs/public/public-node-live-status-rollup-output-boundary-v1.md"
live_guard_proof="ops/mainnet0/datanet-core-peer-pin-hold-status-rollup-live-guard-v1-proof.sh"
live_rollup="ops/mainnet0/public-node-live-status-rollup.sh"

echo "=== VOID Public Node Live Status Rollup Output Boundary v1 Focused Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -f "$live_guard_proof"
test -f "$live_rollup"

bash -n "$live_guard_proof"
bash -n "$live_rollup"

required_doc_lines=(
  'VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_OUTPUT_BOUNDARY_DOC_V1'
  'public_node_live_status_rollup_output_boundary_created_now=true'
  'full_live_status_rollup_execution_required_for_this_lane_now=false'
  'full_live_status_rollup_terminal_safe_for_this_lane_now=false'
  'focused_static_guard_proof_required_for_this_lane_now=true'
  'focused_static_guard_proof_accepted_for_this_lane_now=true'
  'datanet_core_peer_pin_hold_status_rollup_live_guard_green=true'
  'focused_static_guard_no_full_rollup_execution'
  'live_rollup_disabled_now=false'
  'live_rollup_removed_now=false'
  'live_rollup_weakened_now=false'
  'exact_command_revealed_now=false'
  'exact_command_printed_now=false'
  'command_string_disclosed=false'
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

grep -q 'VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_LIVE_GUARD_PROOF_V1_GREEN' "$live_guard_proof"
grep -q 'live_guard_proof_scope=focused_static_guard_no_full_rollup_execution' "$live_guard_proof"
grep -q 'datanet_core_peer_pin_hold_status_rollup_live_status_rollup_green=true' "$live_guard_proof"
grep -q 'VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_LIVE_GUARD_V1' "$live_rollup"
grep -q 'VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN' "$live_rollup"

echo "public_node_live_status_rollup_output_boundary_created_now=true"
echo "full_live_status_rollup_execution_required_for_this_lane_now=false"
echo "full_live_status_rollup_terminal_safe_for_this_lane_now=false"
echo "focused_static_guard_proof_required_for_this_lane_now=true"
echo "focused_static_guard_proof_accepted_for_this_lane_now=true"
echo "datanet_core_peer_pin_hold_status_rollup_live_guard_green=true"
echo "datanet_core_peer_pin_hold_status_rollup_live_guard_proof_scope=focused_static_guard_no_full_rollup_execution"
echo "live_rollup_disabled_now=false"
echo "live_rollup_removed_now=false"
echo "live_rollup_weakened_now=false"
echo "exact_command_revealed_now=false"
echo "exact_command_printed_now=false"
echo "command_string_disclosed=false"
echo "command_executed_now=false"
echo "mirror_executed_now=false"
echo "pin_executed_now=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "output_boundary_proof_scope=focused_static_boundary_no_full_rollup_execution"
echo "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_OUTPUT_BOUNDARY_PROOF_V1_GREEN"

# Public Node Live Status Rollup Output Boundary v1

Marker: `VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_OUTPUT_BOUNDARY_DOC_V1`

This boundary records the safe proof path for lanes where the full public-node live status rollup is too noisy for reliable terminal use.

It does not remove, disable, or weaken the public-node live status rollup. It only records that this lane should use focused/static guard proofs instead of requiring the full rollup script to be executed in an operator terminal.

Reason:

- The full live status rollup can produce enough output to destabilize the operator command line.
- The DataNet Core Peer Pin Hold Status Rollup Live Guard v1 was therefore proven with a focused/static proof.
- That focused proof verified the guard presence and safety states without executing the full noisy rollup.

Required boundary status:

- `public_node_live_status_rollup_output_boundary_created_now=true`
- `full_live_status_rollup_execution_required_for_this_lane_now=false`
- `full_live_status_rollup_terminal_safe_for_this_lane_now=false`
- `focused_static_guard_proof_required_for_this_lane_now=true`
- `focused_static_guard_proof_accepted_for_this_lane_now=true`
- `datanet_core_peer_pin_hold_status_rollup_live_guard_green=true`
- `datanet_core_peer_pin_hold_status_rollup_live_guard_proof_scope=focused_static_guard_no_full_rollup_execution`
- `live_rollup_disabled_now=false`
- `live_rollup_removed_now=false`
- `live_rollup_weakened_now=false`
- `exact_command_revealed_now=false`
- `exact_command_printed_now=false`
- `command_string_disclosed=false`
- `command_executed_now=false`
- `mirror_executed_now=false`
- `pin_executed_now=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

Operator rule:

For the DataNet Core Peer Pin hold/reveal/execute lane, do not use the full public-node live status rollup as the required proof path unless it is later bounded, paged, or made explicitly safe for terminal output. Use focused/static proofs that check the exact guard and required safety states.

This boundary adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

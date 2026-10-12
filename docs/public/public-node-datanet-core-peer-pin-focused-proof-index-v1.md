# DataNet Core Peer Pin Focused Proof Index v1

Marker: `VOID_DATANET_CORE_PEER_PIN_FOCUSED_PROOF_INDEX_DOC_V1`

This index records the safe focused proof path for the DataNet Core Peer Pin hold/reveal/execute lane.

It exists because the full public-node live status rollup can be too noisy for reliable operator-terminal use in this lane. The accepted path is now focused/static proofs that check the exact guard and required safety states without running the full live rollup.

Current focused proof path:

1. Exact Command Reveal Hold Packet v1

   - Proof: `ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-hold-packet-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_HOLD_PACKET_PROOF_V1_GREEN`
   - Purpose: proves the exact command remains held.

2. Exact Command Reveal Final Operator Decision Packet v1

   - Proof: `ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-final-operator-decision-packet-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_FINAL_OPERATOR_DECISION_PACKET_PROOF_V1_GREEN`
   - Purpose: proves the final operator decision is `continue_hold`.

3. Hold Status Rollup v1

   - Proof: `ops/mainnet0/datanet-core-peer-pin-hold-status-rollup-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_PROOF_V1_GREEN`
   - Purpose: proves a compact hold-status rollup exists and adds no authority.

4. Hold Status Rollup Live Guard v1

   - Proof: `ops/mainnet0/datanet-core-peer-pin-hold-status-rollup-live-guard-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_LIVE_GUARD_PROOF_V1_GREEN`
   - Purpose: proves the live guard exists through focused/static validation without executing the full live rollup.

5. Public Node Live Status Rollup Output Boundary v1

   - Proof: `ops/mainnet0/public-node-live-status-rollup-output-boundary-v1-proof.sh`
   - Marker: `VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_OUTPUT_BOUNDARY_PROOF_V1_GREEN`
   - Purpose: proves the full live rollup is not required for this lane and focused/static guard proofs are accepted.

Required index status:

- `datanet_core_peer_pin_focused_proof_index_created_now=true`
- `focused_static_guard_proof_path_indexed_now=true`
- `full_live_status_rollup_execution_required_for_this_lane_now=false`
- `focused_static_guard_proof_required_for_this_lane_now=true`
- `focused_static_guard_proof_accepted_for_this_lane_now=true`
- `peer_pin_current_decision=continue_hold`
- `exact_command_revealed_now=false`
- `exact_command_printed_now=false`
- `command_string_disclosed=false`
- `final_execute_allowed_now=false`
- `terminal_execute_allowed_now=false`
- `command_executed_now=false`
- `mirror_executed_now=false`
- `pin_executed_now=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

Operator rule:

When continuing this lane, start from this index and run the focused proofs above. Do not require the full public-node live status rollup for this lane unless a later bounded-output version makes it terminal-safe.

This index adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

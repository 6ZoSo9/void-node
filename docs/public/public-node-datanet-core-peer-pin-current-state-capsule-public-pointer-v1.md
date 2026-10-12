# DataNet Core Peer Pin Current State Capsule Public Pointer v1

Marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_DOC_V1`

This public pointer records where operators and reviewers should start when checking the current sealed state of the DataNet Core Peer Pin hold/reveal/execute lane.

Pointer target:

- Capsule doc: `docs/public/public-node-datanet-core-peer-pin-current-state-capsule-v1.md`
- Capsule tool: `ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh`
- Capsule proof: `ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1-proof.sh`
- Capsule proof marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1_GREEN`
- Capsule tool marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN`
- Capsule commit/head: `2cc26058`
- Capsule local tag: `ckpt-datanet-core-peer-pin-current-state-capsule-v1-local-green-20260617-214357`
- Capsule cross-box tag: `ckpt-datanet-core-peer-pin-current-state-capsule-v1-cross-box-green-20260617-214516`

Required public pointer status:

- `datanet_core_peer_pin_current_state_capsule_public_pointer_created_now=true`
- `current_state_capsule_public_pointer_target_doc_present=true`
- `current_state_capsule_public_pointer_target_tool_present=true`
- `current_state_capsule_public_pointer_target_proof_present=true`
- `current_state_capsule_public_pointer_target_cross_box_green=true`
- `current_state_capsule_public_pointer_terminal_safe=true`
- `current_state_capsule_public_pointer_runs_full_proof_chain=false`
- `current_state_capsule_public_pointer_runs_full_live_rollup=false`
- `focused_proof_index_head=2ada51df`
- `current_state_capsule_head=2cc26058`
- `peer_pin_current_decision=continue_hold`
- `exact_command_reveal_allowed_now=false`
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

For the DataNet Core Peer Pin lane, use the Current State Capsule v1 as the first public-safe orientation checkpoint. If deeper validation is needed, use the Focused Proof Index v1 and the focused/static proofs named there.

This pointer does not run the full proof chain, does not run the full public-node live status rollup, does not reveal the exact command, does not print the exact command, does not disclose the command string, does not execute, does not mirror, does not pin, does not mutate public state, does not write a ledger entry, and does not award Work Credits.

This pointer adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

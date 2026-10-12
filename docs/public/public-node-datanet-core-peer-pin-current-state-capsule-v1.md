# DataNet Core Peer Pin Current State Capsule v1

Marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_DOC_V1`

This capsule records the current sealed state of the DataNet Core Peer Pin hold/reveal/execute lane.

It is a tiny static status capsule for quick operator orientation. It does not run the full proof chain, does not run the full public-node live status rollup, and does not reveal, print, disclose, execute, mirror, pin, mutate, write a ledger entry, or award Work Credits.

Latest focused proof index:

- Commit/head: `2ada51df`
- Local tag: `ckpt-datanet-core-peer-pin-focused-proof-index-v1-local-green-20260617-213519`
- Cross-box tag: `ckpt-datanet-core-peer-pin-focused-proof-index-v1-cross-box-green-20260617-213704`
- Proof marker: `VOID_DATANET_CORE_PEER_PIN_FOCUSED_PROOF_INDEX_PROOF_V1_GREEN`
- Proof scope: `static_index_no_full_rollup_execution_no_chain_execution`

Required current state:

- `datanet_core_peer_pin_current_state_capsule_created_now=true`
- `current_state_capsule_terminal_safe=true`
- `current_state_capsule_runs_full_proof_chain=false`
- `current_state_capsule_runs_full_live_rollup=false`
- `focused_proof_index_head=2ada51df`
- `focused_proof_index_cross_box_green=true`
- `focused_static_guard_proof_path_indexed_now=true`
- `full_live_status_rollup_execution_required_for_this_lane_now=false`
- `focused_static_guard_proof_required_for_this_lane_now=true`
- `focused_static_guard_proof_accepted_for_this_lane_now=true`
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

Use this capsule as the fastest “where are we?” checkpoint for the DataNet Core Peer Pin lane. If deeper validation is needed, start from the Focused Proof Index v1 and run the focused/static proofs named there. Do not require the full public-node live status rollup for this lane unless a later bounded-output version makes it explicitly terminal-safe.

This capsule adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

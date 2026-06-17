# DataNet Core Peer Pin Current State Capsule Quick Command Packet v1

Marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_DOC_V1`

This packet records the safe operator command for checking the current sealed state of the DataNet Core Peer Pin hold/reveal/execute lane.

Safe command:

```bash
bash ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh

The command prints the Current State Capsule v1 only.

It does not run the full proof chain, does not run the full public-node live status rollup, does not reveal the exact peer pin command, does not print the exact peer pin command, does not disclose the command string, does not execute terminal actions, does not mirror content, does not pin content, does not mutate public state, does not write a ledger entry, and does not award Work Credits.

Required quick command packet status:

datanet_core_peer_pin_current_state_capsule_quick_command_packet_created_now=true
quick_command_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh
quick_command_target_tool_present=true
quick_command_target_tool_cross_box_green=true
quick_command_terminal_safe=true
quick_command_runs_full_proof_chain=false
quick_command_runs_full_live_rollup=false
quick_command_reveals_exact_command=false
quick_command_prints_exact_command=false
quick_command_discloses_command_string=false
quick_command_executes_terminal_action=false
quick_command_mirrors_content=false
quick_command_pins_content=false
quick_command_public_mutation=false
quick_command_ledger_write=false
quick_command_wc_credit_award=false
peer_pin_current_decision=continue_hold
current_state_capsule_head=2cc26058
current_state_capsule_public_pointer_head=710e79bd

Operator rule:

Use this command for quick orientation only. For deeper verification, use the Current State Capsule Public Pointer v1, Current State Capsule v1, and Focused Proof Index v1. Do not require the full public-node live status rollup for this lane unless a later bounded-output version makes it explicitly terminal-safe.

This packet adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

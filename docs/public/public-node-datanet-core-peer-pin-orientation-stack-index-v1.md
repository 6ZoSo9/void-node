# DataNet Core Peer Pin Orientation Stack Index v1

Marker: `VOID_DATANET_CORE_PEER_PIN_ORIENTATION_STACK_INDEX_DOC_V1`

This index records the safe orientation stack for the DataNet Core Peer Pin hold/reveal/execute lane.

The purpose is to give future operators and reviewers a single starting point that explains where to look first, which checkpoints are already sealed, and which commands/proofs are safe for orientation.

Safe orientation stack:

1. Focused Proof Index v1
   - Head: `2ada51df`
   - Cross-box tag: `ckpt-datanet-core-peer-pin-focused-proof-index-v1-cross-box-green-20260617-213704`
   - Proof marker: `VOID_DATANET_CORE_PEER_PIN_FOCUSED_PROOF_INDEX_PROOF_V1_GREEN`

2. Current State Capsule v1
   - Head: `2cc26058`
   - Cross-box tag: `ckpt-datanet-core-peer-pin-current-state-capsule-v1-cross-box-green-20260617-214516`
   - Tool marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN`
   - Proof marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PROOF_V1_GREEN`

3. Current State Capsule Public Pointer v1
   - Head: `710e79bd`
   - Cross-box tag: `ckpt-datanet-core-peer-pin-current-state-capsule-public-pointer-v1-cross-box-green-20260617-215136`
   - Proof marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_PUBLIC_POINTER_PROOF_V1_GREEN`

4. Current State Capsule Quick Command Packet v1
   - Head: `d6ca5538`
   - Cross-box tag: `ckpt-datanet-core-peer-pin-current-state-capsule-quick-command-packet-v1-cross-box-green-20260617-215935`
   - Proof marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_PACKET_PROOF_V1_GREEN`

5. Current State Capsule Quick Command Smoke Receipt v1
   - Head: `bc4c3a8f`
   - Cross-box tag: `ckpt-datanet-core-peer-pin-current-state-capsule-quick-command-smoke-receipt-v1-cross-box-green-20260617-220701`
   - Proof marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_PROOF_V1_GREEN`

Safe operator orientation command:

```bash
bash ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh

Required orientation stack index status:

datanet_core_peer_pin_orientation_stack_index_created_now=true
orientation_stack_index_terminal_safe=true
orientation_stack_index_runs_current_state_capsule=false
orientation_stack_index_runs_smoke_receipt=false
orientation_stack_index_runs_full_proof_chain=false
orientation_stack_index_runs_full_live_rollup=false
orientation_stack_index_focused_proof_index_head=2ada51df
orientation_stack_index_current_state_capsule_head=2cc26058
orientation_stack_index_public_pointer_head=710e79bd
orientation_stack_index_quick_command_packet_head=d6ca5538
orientation_stack_index_smoke_receipt_head=bc4c3a8f
orientation_stack_index_all_cross_box_green=true
orientation_stack_index_safe_start_point=true
peer_pin_current_decision=continue_hold
exact_command_reveal_allowed_now=false
exact_command_revealed_now=false
exact_command_printed_now=false
command_string_disclosed=false
final_execute_allowed_now=false
terminal_execute_allowed_now=false
command_executed_now=false
mirror_executed_now=false
pin_executed_now=false
public_mutation=false
ledger_write=false
wc_credit_award=false

Operator rule:

For a future restart of this lane, begin with this Orientation Stack Index v1, then use the Current State Capsule quick command for a safe current-state read. Use the Focused Proof Index v1 only when deeper static validation is needed.

Do not require the full public-node live status rollup for this lane unless a later bounded-output version makes it explicitly terminal-safe.

This index does not run the Current State Capsule command, does not run the smoke receipt, does not run the full proof chain, does not run the full public-node live status rollup, does not reveal the exact peer pin command, does not print the exact peer pin command, does not disclose the command string, does not execute terminal actions, does not mirror content, does not pin content, does not mutate public state, does not write a ledger entry, and does not award Work Credits.

This index adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

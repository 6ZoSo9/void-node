# DataNet Core Peer Pin Current State Capsule Quick Command Smoke Receipt v1

Marker: `VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_QUICK_COMMAND_SMOKE_RECEIPT_DOC_V1`

This receipt records a bounded smoke check for the safe Current State Capsule quick command.

Safe command being smoke checked:

```bash
bash ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh

Receipt purpose:

The smoke receipt proves that the safe quick command can run and only emits the sealed Current State Capsule state. It does not run the full proof chain, does not run the full public-node live status rollup, does not reveal the exact peer pin command, does not print the exact peer pin command, does not disclose the command string, does not execute terminal actions, does not mirror content, does not pin content, does not mutate public state, does not write a ledger entry, and does not award Work Credits.

Required quick command smoke receipt status:

datanet_core_peer_pin_current_state_capsule_quick_command_smoke_receipt_created_now=true
quick_command_smoke_target_tool=ops/mainnet0/datanet-core-peer-pin-current-state-capsule-v1.sh
quick_command_smoke_target_tool_present=true
quick_command_smoke_runs_target_tool_once=true
quick_command_smoke_runs_full_proof_chain=false
quick_command_smoke_runs_full_live_rollup=false
quick_command_smoke_reveals_exact_command=false
quick_command_smoke_prints_exact_command=false
quick_command_smoke_discloses_command_string=false
quick_command_smoke_executes_terminal_action=false
quick_command_smoke_mirrors_content=false
quick_command_smoke_pins_content=false
quick_command_smoke_public_mutation=false
quick_command_smoke_ledger_write=false
quick_command_smoke_wc_credit_award=false
quick_command_smoke_terminal_safe=true
quick_command_smoke_output_marker_required=VOID_DATANET_CORE_PEER_PIN_CURRENT_STATE_CAPSULE_V1_GREEN
peer_pin_current_decision=continue_hold
current_state_capsule_head=2cc26058
current_state_capsule_public_pointer_head=710e79bd
quick_command_packet_head=d6ca5538

Expected safe output facts:

datanet_core_peer_pin_current_state_capsule_created_now=true
current_state_capsule_terminal_safe=true
current_state_capsule_runs_full_proof_chain=false
current_state_capsule_runs_full_live_rollup=false
focused_proof_index_head=2ada51df
focused_proof_index_cross_box_green=true
focused_static_guard_proof_path_indexed_now=true
full_live_status_rollup_execution_required_for_this_lane_now=false
focused_static_guard_proof_required_for_this_lane_now=true
focused_static_guard_proof_accepted_for_this_lane_now=true
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
current_state_capsule_adds_authority=false

This receipt adds no reveal authority, no terminal execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

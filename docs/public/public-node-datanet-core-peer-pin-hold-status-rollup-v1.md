# DataNet Core Peer Pin Hold Status Rollup v1

Marker: `VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_DOC_V1`

This rollup is a public-safe status summary after Exact Command Reveal Hold Packet v1 and Exact Command Reveal Final Operator Decision Packet v1.

It records that the peer pin lane remains intentionally held after cross-box proof. It does not reveal the exact command, print the exact command, disclose the command string, execute shell commands, mirror content, pin content, mutate public state, write a ledger entry, or award Work Credits.

Required status:

- `peer_pin_hold_status_rollup_created_now=true`
- `peer_pin_hold_status_rollup_decision=continue_hold`
- `peer_pin_hold_status_rollup_hold_chain_green=true`
- `peer_pin_hold_status_rollup_final_operator_decision_green=true`
- `peer_pin_hold_status_rollup_cross_box_required=true`
- `peer_pin_hold_status_rollup_cross_box_green=true`
- `exact_command_reveal_move_to_reveal_now=false`
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

This rollup adds no authority. It is a status surface only.

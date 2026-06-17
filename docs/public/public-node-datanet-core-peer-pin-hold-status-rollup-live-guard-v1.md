# DataNet Core Peer Pin Hold Status Rollup Live Guard v1

Marker: `VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_LIVE_GUARD_DOC_V1`

This live guard integrates DataNet Core Peer Pin Hold Status Rollup v1 into the main public-node live status rollup.

It is a status-only guard. It does not reveal the exact command, print the exact command, disclose the command string, execute shell commands, mirror content, pin content, mutate public state, write a ledger entry, or award Work Credits.

Required live rollup status:

- `datanet_core_peer_pin_hold_status_rollup_live_status_rollup_green=true`
- `peer_pin_hold_status_rollup_decision=continue_hold`
- `peer_pin_hold_status_rollup_hold_chain_green=true`
- `peer_pin_hold_status_rollup_final_operator_decision_green=true`
- `peer_pin_hold_status_rollup_cross_box_green=true`
- `peer_pin_hold_status_rollup_adds_authority=false`
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

This guard only reports the already-sealed hold state. It adds no new release, reveal, terminal, mirror, pin, ledger, or Work Credit authority.

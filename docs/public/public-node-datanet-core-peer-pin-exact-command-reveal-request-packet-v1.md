# DataNet Core Peer Pin Exact Command Reveal Request Packet v1

Marker: `VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_DOC_V1`

This packet is the public-safe request boundary after Command Disclosure Approval Packet v1.

It proves command disclosure approval exists and records that exact command reveal has been requested for a later operator-only step. It does not reveal the exact command, print the exact command, execute shell commands, mirror content, pin content, mutate public state, write a ledger entry, or award Work Credits.

Required states:

- `command_disclosure_approved_now=true`
- `exact_command_reveal_request_recorded_now=true`
- `exact_command_reveal_approved_now=false`
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

# VOID USDC/VOID Buy Pool Operator Manual Execution Packet Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1`

Status: `private_operator_manual_execution_packet_hold_only`

This private/operator-facing hold defines the shape and required safety conditions of a future manual execution packet after a manual fulfillment record reaches:

`approved_for_separate_manual_execution_packet`

This hold does not execute anything.

It does not create, expose, or imply:

- a wallet send command,
- an execution command,
- transaction calldata,
- private-key material,
- a private-key action,
- a signed transaction,
- a broadcast command,
- an RPC write action,
- a token delivery transaction,
- a token transfer execution,
- an automatic fulfillment path,
- an automatic receipt acceptance path,
- a public receipt intake endpoint,
- a public mutation route,
- a public buyer queue,
- guaranteed delivery,
- an investment return, yield, or profit promise.

## Relationship to prior records

Prior sealed private records:

1. Operator Receipt Review Packet v1
2. Operator Receipt Decision Record Fixture v1
3. Operator Fulfillment Review Boundary v1
4. Operator Manual Fulfillment Record Fixture v1

This hold begins only after the manual fulfillment record reaches:

`approved_for_separate_manual_execution_packet`

That state is not execution.
This hold is not execution.
This hold is a withheld execution packet shape only.

## Hold purpose

A future manual execution packet should capture:

1. source receipt reference,
2. source decision record reference,
3. source fulfillment review boundary reference,
4. source manual fulfillment record reference,
5. destination wallet rule,
6. candidate VOID amount,
7. pool capacity check,
8. execution separation rule,
9. command withholding rule,
10. calldata withholding rule,
11. signing and broadcast withholding rule,
12. operator separate-execution requirement,
13. explicit safety flags proving no send action occurred.

## Allowed hold states

Allowed hold states:

- `draft_hold`
- `blocked_missing_manual_fulfillment_record`
- `blocked_identity_mismatch`
- `blocked_capacity`
- `held_execution_packet_shape_only`
- `ready_for_separate_operator_execution_packet`

No state performs token delivery.
No state creates transaction calldata.
No state creates a wallet transaction.
No state signs a transaction.
No state broadcasts a transaction.
No state authorizes an automatic process.

## Destination wallet rule

Default rule:

- The sending wallet is the receipt identity.
- The sending wallet is the default fulfillment identity.
- Any different destination wallet requires separate operator approval and may require wallet proof.

## Calculation rule

Given:

- `amount_usdc`
- `price_usdc_per_void = 0.50`

Then:

- `candidate_void_amount = amount_usdc / 0.50`
- equivalently: `candidate_void_amount = amount_usdc * 2`

This calculation is packet evidence only.
It is not transaction calldata.
It is not a token delivery transaction.
It is not a delivery promise.
It is not an investment return promise.

## Required withholding rule

This hold must preserve:

- `command_withheld = true`
- `calldata_withheld = true`
- `signed_transaction_withheld = true`
- `broadcast_withheld = true`
- `private_key_required_now = false`
- `operator_must_execute_separately = true`

The future execution packet, if ever created, must be a separate operator-controlled packet.

This hold must not include:

- transaction calldata,
- private key material,
- wallet command,
- signed transaction,
- broadcast command,
- RPC write action,
- token transfer execution.

## Required safety flags

A safe hold must preserve:

- `private_operator_manual_execution_packet_hold_only = true`
- `execution_packet_hold_created_for_fixture = true`
- `execution_command_created = false`
- `command_withheld = true`
- `calldata_created = false`
- `calldata_withheld = true`
- `private_key_required_now = false`
- `private_key_action_enabled = false`
- `wallet_send_command_created = false`
- `wallet_send_enabled = false`
- `signed_transaction_created = false`
- `signed_transaction_withheld = true`
- `broadcast_transaction_enabled = false`
- `broadcast_withheld = true`
- `rpc_write_enabled = false`
- `token_delivery_transaction_created = false`
- `token_transfer_executed_now = false`
- `operator_must_execute_separately = true`
- `automatic_fulfillment_enabled = false`
- `automatic_receipt_acceptance_enabled = false`
- `public_receipt_intake_endpoint_open = false`
- `public_receipt_mutation_enabled = false`
- `public_queue_exposed = false`
- `fulfillment_promised = false`
- `investment_return_promised = false`
- `route_added = false`
- `src_index_modified = false`

## Fixture

The machine-readable private fixture is:

`fixtures/private/usdc-void-buy-pool-operator-manual-execution-packet-hold-v1.json`

The fixture uses placeholder values only. It must not contain real buyer details.

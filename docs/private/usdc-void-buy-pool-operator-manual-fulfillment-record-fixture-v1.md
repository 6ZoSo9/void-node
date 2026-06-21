# VOID USDC/VOID Buy Pool Operator Manual Fulfillment Record Fixture v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_FULFILLMENT_RECORD_FIXTURE_V1`

Status: `private_operator_manual_fulfillment_record_fixture_only`

This private/operator-facing fixture defines the shape of a future manual fulfillment approval record after the fulfillment review boundary is satisfied.

It does not create, expose, or imply:

- a wallet send command,
- an execution command,
- a private-key action,
- a token delivery transaction,
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

This fixture begins only after the fulfillment review boundary reaches:

`ready_for_separate_manual_fulfillment_record`

That state is not execution.
This fixture is not execution.
This fixture only defines the future manual fulfillment record shape.

## Record purpose

A future manual fulfillment record should capture:

1. source receipt reference,
2. source decision record reference,
3. source fulfillment review boundary reference,
4. operator approval state,
5. sender identity rule,
6. destination wallet rule,
7. candidate VOID amount,
8. pool capacity check,
9. redaction policy,
10. required execution separation,
11. explicit safety flags proving no send action occurred.

## Allowed manual fulfillment record states

Allowed states:

- `draft`
- `needs_more_info`
- `blocked_boundary_not_ready`
- `blocked_duplicate`
- `blocked_capacity`
- `blocked_sender_identity`
- `blocked_delivery_wallet_mismatch`
- `approved_for_separate_manual_execution_packet`

No state performs token delivery.
No state creates a wallet transaction.
No state authorizes an automatic process.

## Destination wallet rule

Default rule:

- The sending wallet is the receipt identity.
- The sending wallet is the default fulfillment identity.

If a different destination wallet is requested:

- it must not be accepted automatically,
- it must require separate operator approval,
- wallet proof may be required,
- the final record must explain why destination differs from the sender wallet.

## Calculation rule

Given:

- `amount_usdc`
- `price_usdc_per_void = 0.50`

Then:

- `candidate_void_amount = amount_usdc / 0.50`
- equivalently: `candidate_void_amount = amount_usdc * 2`

This calculation is record evidence only.
It is not a token delivery transaction.
It is not a delivery promise.
It is not an investment return promise.

## Required execution separation

Even if a future manual fulfillment record reaches:

`approved_for_separate_manual_execution_packet`

the next step must still be a separate operator-controlled execution packet.

This fixture must not include:

- transaction calldata,
- private key material,
- wallet command,
- signed transaction,
- broadcast command,
- RPC write action,
- token transfer execution.

## Required safety flags

A safe fixture must preserve:

- `private_operator_manual_fulfillment_record_fixture_only = true`
- `manual_fulfillment_record_created_for_fixture = true`
- `execution_command_created = false`
- `execution_packet_created = false`
- `wallet_send_command_created = false`
- `wallet_send_enabled = false`
- `private_key_action_enabled = false`
- `signed_transaction_created = false`
- `broadcast_transaction_enabled = false`
- `rpc_write_enabled = false`
- `token_delivery_transaction_created = false`
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

`fixtures/private/usdc-void-buy-pool-operator-manual-fulfillment-record-fixture-v1.json`

The fixture uses placeholder values only. It must not contain real buyer details.

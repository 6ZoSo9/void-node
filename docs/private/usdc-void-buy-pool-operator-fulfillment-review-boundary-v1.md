# VOID USDC/VOID Buy Pool Operator Fulfillment Review Boundary v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_FULFILLMENT_REVIEW_BOUNDARY_V1`

Status: `private_operator_fulfillment_review_boundary_only`

This private/operator-facing boundary defines what must be true before a buy-pool receipt may move from operator decision review into a separate future fulfillment review.

It does not create, expose, or imply:

- a wallet send command,
- a private-key action,
- a token delivery transaction,
- a public receipt intake endpoint,
- a public mutation route,
- a public buyer queue,
- automatic receipt acceptance,
- automatic fulfillment,
- guaranteed delivery,
- an investment return, yield, or profit promise.

## Relationship to prior records

Prior sealed private records:

1. Operator Receipt Review Packet v1
2. Operator Receipt Decision Record Fixture v1

This boundary begins only after a decision record has state:

`approved_for_manual_fulfillment_review`

That state is not fulfillment.
It only permits a separate manual fulfillment review.

## Boundary purpose

This boundary defines the minimum facts an operator must confirm before any later, separate fulfillment execution lane can even be considered.

It does not authorize execution.

## Required preconditions

A fulfillment review boundary may only be considered if all are true:

1. `decision_record_exists = true`
2. `decision_state = approved_for_manual_fulfillment_review`
3. `decision_record_operator_approved = true`
4. `duplicate_check_performed = true`
5. `duplicate_found = false`
6. `chain_check = passed_base`
7. `asset_check = passed_usdc`
8. `receiver_check = passed_configured_receiver`
9. `sender_wallet_is_receipt_identity = true`
10. `candidate_void_amount_computed = true`
11. `pool_capacity_confirmed = true`
12. `redaction_policy_confirmed = true`
13. `manual_operator_review_required = true`

## Sender / delivery wallet boundary

Default rule:

- The sending wallet is the receipt identity.
- The sending wallet is the default fulfillment identity.

If a different delivery wallet is requested:

- it must not be accepted automatically,
- it must require separate operator approval,
- wallet proof may be required,
- the final record must explain why delivery wallet differs from sender wallet.

## Fulfillment review states

Allowed fulfillment review boundary states:

- `not_ready`
- `needs_more_info`
- `blocked_duplicate`
- `blocked_capacity`
- `blocked_sender_identity`
- `blocked_delivery_wallet_mismatch`
- `ready_for_separate_manual_fulfillment_record`

No state performs fulfillment.

## Manual calculation rule

Given:

- `amount_usdc`
- `price_usdc_per_void = 0.50`

Then:

- `candidate_void_amount = amount_usdc / 0.50`
- equivalently: `candidate_void_amount = amount_usdc * 2`

This is a review boundary calculation only.
It is not a token delivery transaction and not a delivery promise.

## Required safety flags

A safe boundary record must preserve:

- `private_operator_fulfillment_review_boundary_only = true`
- `wallet_send_command_created = false`
- `wallet_send_enabled = false`
- `private_key_action_enabled = false`
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

`fixtures/private/usdc-void-buy-pool-operator-fulfillment-review-boundary-v1.json`

The fixture uses placeholder values only. It must not contain real buyer details.

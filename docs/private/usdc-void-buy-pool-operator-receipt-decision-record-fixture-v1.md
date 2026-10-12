# VOID USDC/VOID Buy Pool Operator Receipt Decision Record Fixture v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_DECISION_RECORD_FIXTURE_V1`

Status: `private_operator_decision_record_fixture_only`

This private fixture defines the shape of a future manual operator decision record after receipt review.

It does not create, expose, or imply:

- a public receipt intake endpoint,
- a public receipt mutation route,
- a public buyer queue,
- an automatic receipt acceptance path,
- an automatic fulfillment path,
- a wallet send action,
- a private key action,
- a token delivery transaction,
- a delivery promise,
- an investment return, yield, or profit promise.

## Relationship to prior packet

The prior private operator receipt review packet defines how an operator reviews a buyer-submitted transaction hash.

This decision record fixture defines what a separate manual decision record should contain after that review.

The review packet is not a decision.
This fixture is not fulfillment.
Any later fulfillment would require a separate explicitly operator-approved fulfillment record and a separate execution boundary.

## Decision record purpose

A valid decision record should capture:

1. the receipt under review,
2. the review result,
3. the exact operator decision state,
4. duplicate-check result,
5. sender identity rule,
6. amount calculation,
7. allocation/capacity check,
8. redaction/publication rule,
9. whether separate fulfillment review is allowed,
10. explicit non-automation and no-wallet-action flags.

## Allowed decision states

Allowed decision states:

- `needs_more_info`
- `rejected_wrong_chain`
- `rejected_wrong_asset`
- `rejected_wrong_receiver`
- `rejected_exchange_or_pooled_sender`
- `rejected_duplicate_tx_hash`
- `rejected_pool_closed`
- `valid_receipt_candidate`
- `approved_for_manual_fulfillment_review`

No allowed state performs fulfillment.

## Required record fields

A future decision record should include:

- `record_type`
- `marker`
- `schema_version`
- `created_at_utc`
- `operator_id`
- `decision_state`
- `receipt_reference`
- `review_inputs`
- `verification_results`
- `duplicate_check`
- `calculation`
- `pool_capacity_check`
- `sender_identity_rule`
- `redaction_policy`
- `safety_flags`
- `next_allowed_step`
- `operator_attestation`

## Sender identity rule

The sender wallet is the receipt identity and default fulfillment identity unless a separate operator-approved record explicitly says otherwise.

If a buyer asks for delivery to a different wallet, the record must not treat that as automatic.
It must be escalated to separate operator review.

## Calculation rule

Given:

- `amount_usdc`
- `price_usdc_per_void = 0.50`

Then:

- `candidate_void_amount = amount_usdc / 0.50`
- equivalently: `candidate_void_amount = amount_usdc * 2`

This calculation is evidence for the decision record only.
It is not a fulfillment action or promise.

## Required safety flags

A safe decision record must preserve:

- `private_operator_decision_record_fixture_only = true`
- `public_receipt_intake_endpoint_open = false`
- `public_receipt_mutation_enabled = false`
- `public_queue_exposed = false`
- `automatic_receipt_acceptance_enabled = false`
- `automatic_fulfillment_enabled = false`
- `wallet_send_enabled = false`
- `private_key_action_enabled = false`
- `token_delivery_transaction_created = false`
- `fulfillment_promised = false`
- `investment_return_promised = false`
- `route_added = false`
- `src_index_modified = false`

## Fixture

The machine-readable private fixture is:

`fixtures/private/usdc-void-buy-pool-operator-receipt-decision-record-fixture-v1.json`

The fixture uses placeholder values only. It must not contain real buyer details.

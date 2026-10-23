# Buy VOID verified-payment V3 staging instruction-amount binding

Status: **Draft / source and CI only**. This successor hardens the unmounted
verified-payment V2 allocation staging claim. It does not mount a route, append
a payment event, reserve inventory, call custody IPC, sign a transaction,
activate the presale, or move funds.

## Exact parent

This branch is based on reviewed Draft #3710 exact head
`42041eb8dc28aac2e26dfcc4b144caa729829d12`.

The parent staging generation used:

- `src/economic/buy_void_verified_payment_v2_allocation_stage.ts`
  blob `ef397b7377a87326187f5e2e9882d6e4bdc0a4f8`
- `scripts/prove_buy_void_verified_payment_v2_allocation_stage.ts`
  blob `d447fad19edbb0897166f67ab2e435fe34d5e164`

## Defect closed

The V2 verifier validates nested payment-instruction chain, token, decimals,
sender and receiver, but its selected immutable event snapshot deliberately
does not retain `payment_instructions.amount`. The staging layer previously
bound the verified transfer amount to top-level `request.usdc_amount` while
never re-checking the buyer-facing nested instructed amount.

A later or contradictory request snapshot could therefore retain a valid
verified event and top-level amount while presenting a different nested
instruction amount and still receive the non-authoritative
`staged_unmounted` classification.

This successor requires an own enumerable `payment_instructions.amount`,
parses the same canonical positive decimal primitive forms used by the checkout
request contract, converts to micro-USDC, and requires exact equality with both:

1. the original staging snapshot's top-level `usdc_amount`; and
2. the V2 verifier's exact `amount_units`.

Missing, zero, negative, padded, exponent, over-precision, non-primitive, or
mismatched instruction amounts fail closed.

## Original-history boundary remains separate

This source-only staging function still does **not** claim that the supplied
request is the authenticated first durable request row:

```text
original_first_request_history_qualified=false
locked_writer_preappend_history_gate_required=true
```

The existing value-bearing writer remains the authority boundary. Under the
serialized verified-payment capacity admission and terminal request lock,
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` reuses
`classifyBuyVoidPreappendVerifiedPaymentLineageV1` against the retained
request/operator/allocation histories before appending the payment event or
persisting allocation. That classifier permanently rejects first rows missing
native-USDC contract, buyer address, or canonical launch authority.

This successor does not replace, weaken, or promote that writer gate.

## Preserved HOLDs

```text
source_only_unmounted=true
original_first_request_history_qualified=false
source_finality_authentication_verified=false
cross_uid_service_authenticated=false
mounted_verified_allocation_dispatch=false
payment_capacity_lock_verified=false
payment_acceptance=false
presale_activation=false
funds_movement=false
```

**PROTECT THE CORE.**

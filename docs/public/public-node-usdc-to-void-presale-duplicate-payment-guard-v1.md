# USDC → VOID Presale Duplicate Payment Guard v1

Marker: `VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1`

## Purpose

Define the duplicate-payment guard contract required before USDC → VOID presale automatic fulfillment can ever be enabled.

This gate does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Problem sealed

A verified USDC payment detector is not sufficient by itself. The same USDC transaction or the same matching transfer log must not be allowed to satisfy more than one presale request.

Historical request accounting could count payment-verified events by
`request_id`. The reviewed source now applies the canonical payment-identity
classifier inside the same serialized capacity-admission boundary that persists
a new verified payment.

That is source integration, not a live-deployment claim. The public guard stays
false until deployment and requalification prove those reviewed bytes are the
runtime serving Buy VOID.

## Required payment identity

A duplicate-safe verified payment record must bind the following fields into a canonical payment identity:

- source chain
- transaction hash
- receipt transaction hash
- USDC token contract
- matching ERC-20 Transfer log index
- official receiver address
- verified amount
- request id

The intended canonical key is:

`source_chain:transaction_hash:log_index`

If log index is unavailable, the payment must remain blocked from automatic fulfillment until the verifier records enough receipt/log identity to prove uniqueness.

## Required guard behavior

- One canonical payment identity may satisfy at most one request.
- Reusing the same canonical payment identity for a second request must fail closed.
- A request id alone is not a duplicate-payment guard.
- A submitted tx hash alone is not a verified payment.
- A verified payment alone does not enable automatic fulfillment.
- Duplicate guard must be green before allocation reservation or automatic fulfillment.
- Inventory guard must also be green before allocation reservation or automatic fulfillment.
- Explicit operator activation record must still be required before automatic fulfillment.

## Inventory effect

- `quote_created`: no inventory effect.
- `payment_pending`: no inventory effect.
- `payment_submitted_unverified`: no inventory effect.
- `submitted_tx_hash`: no inventory effect.
- `payment_verified_without_duplicate_guard`: no automatic fulfillment and no automatic VOID transfer.
- `payment_verified_with_duplicate_guard_green`: allocation may reserve only if inventory guard is also green.

## Current authority

- `duplicate_payment_guard_defined`: true
- `source_duplicate_guard_classifier_green`: true
- `source_runtime_duplicate_guard_integrated`: true
- `duplicate_payment_guard_green`: false
- `current_public_runtime_duplicate_payment_guard_enforced`: false
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Source implementation

- `src/economic/buy_void_verified_payment_duplicate_guard_v1.ts`
- `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
- `scripts/prove_buy_void_verified_payment_duplicate_guard_runtime_integration_v1.ts`

The live-source verifier writes an identity-complete V2 verified-payment event,
and the capacity admission rechecks the canonical identity before and after the
durable append.

## Public route

- `/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1.json`

The route remains conservative until live deployment/requalification.

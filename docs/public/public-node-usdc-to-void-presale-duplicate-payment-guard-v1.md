# USDC → VOID Presale Duplicate Payment Guard v1

Marker: `VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1`

## Purpose

Define the duplicate-payment guard contract required before USDC → VOID presale automatic fulfillment can ever be enabled.

This gate does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Problem sealed

A verified USDC payment detector is not sufficient by itself. The same USDC transaction or the same matching transfer log must not be allowed to satisfy more than one presale request.

Historical request accounting could count payment-verified events by `request_id`.
The reviewed source writer now enforces payment identity, not only request
identity, inside the same serialized finite-capacity admission boundary.

That is a source capability only. The public/live verifier remains fail-closed
until deployment and runtime requalification prove the reviewed source is the
code actually serving Buy VOID.

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
- `source_verified_payment_duplicate_identity_enforced`: true
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

- `src/economic/buy_void_verified_payment_identity_admission_v1.ts`
- `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
- `scripts/prove_buy_void_verified_payment_identity_admission_v1.ts`

The source guard rejects reuse of one canonical payment identity across
requests, rejects a request changing to a different verified payment identity,
and treats only exact request + identity replay as idempotent.

## Public route

- `/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1.json`

The public route remains conservative until live deployment/requalification; it
must not infer live enforcement merely because the source guard is green.

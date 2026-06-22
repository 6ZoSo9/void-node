# USDC → VOID Presale Duplicate Payment Guard v1

Marker: `VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1`

## Purpose

Define the duplicate-payment guard contract required before USDC → VOID presale automatic fulfillment can ever be enabled.

This gate does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Problem sealed

A verified USDC payment detector is not sufficient by itself. The same USDC transaction or the same matching transfer log must not be allowed to satisfy more than one presale request.

Current request accounting can count payment-verified events by `request_id`. This duplicate-payment guard requires future runtime enforcement by payment identity, not only request identity.

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
- `duplicate_payment_guard_green`: false
- `current_verifier_duplicate_payment_guard_enforced`: false
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Public route

- `/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1.json`

# USDC/VOID Buy Pool Automatic Payment Canary Private Allocation Ledger Write Preflight v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1`

## Purpose

Define the private operator-only preflight gate before any USDC/VOID automatic payment canary private allocation ledger write.

This gate consumes one deterministic allocation record object after allocation record creation and decides whether it is eligible for a later separate private ledger write packet.

## Required upstream state

The upstream allocation record creation gate output must include:

- `allocation_record_creation_gate.state`: `allocation_record_created_pending_private_allocation_ledger_write_gate`
- `allocation_record.allocation_record_status`: `allocation_record_created_pending_private_allocation_ledger_write_gate`
- `authority.allocation_record_created`: `true`
- `authority.private_allocation_ledger_write`: `false`
- `authority.fulfillment_execution`: `false`
- `authority.wallet_signing`: `false`
- `authority.void_transfer`: `false`
- `authority.public_mutation`: `false`

## Boundary

This is private/operator-only.

This preflight may mark one allocation record as eligible for a later separate private allocation ledger write packet.

It does not append the private allocation ledger.
It does not mutate any ledger file.
It does not execute fulfillment.
It does not create a wallet signature.
It does not transfer VOID.
It does not expose wallet, treasury, signer, private ledger path, or operator execution material.
It does not create a public mutation route.

## Canary cap

Only one canary allocation record may pass this preflight before operator review.

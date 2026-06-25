# USDC/VOID Buy Pool Automatic Payment Canary Private Allocation Ledger Write Packet Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_V1`

## Purpose

Define the private operator-only packet hold before any USDC/VOID automatic payment canary private allocation ledger write.

This hold consumes the private allocation ledger write preflight output and emits one deterministic private ledger write packet shape for later operator review.

## Required upstream state

The upstream preflight output must include:

- `private_allocation_ledger_write_preflight.state`: `eligible_pending_separate_private_allocation_ledger_write_packet`
- `preflight.preflight_status`: `eligible_pending_separate_private_allocation_ledger_write_packet`
- `authority.preflight_passed`: `true`
- `authority.private_allocation_ledger_write_now`: `false`
- `authority.private_allocation_ledger_mutation`: `false`
- `authority.fulfillment_execution`: `false`
- `authority.wallet_signing`: `false`
- `authority.void_transfer`: `false`
- `authority.public_mutation`: `false`

## Boundary

This is private/operator-only.

This hold may emit one ledger write packet shape for later operator review.

It does not append the private allocation ledger.
It does not mutate any ledger file.
It does not execute fulfillment.
It does not create a wallet signature.
It does not transfer VOID.
It does not expose wallet, treasury, signer, private ledger path, or operator execution material.
It does not create a public mutation route.

## Canary cap

Only one canary private allocation ledger write packet may be created before operator review.

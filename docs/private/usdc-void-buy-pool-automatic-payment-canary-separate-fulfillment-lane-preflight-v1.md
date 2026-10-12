# USDC/VOID Buy Pool Automatic Payment Canary Separate Fulfillment Lane Preflight v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_LANE_PREFLIGHT_V1`

## Purpose

Define a private/operator-only preflight for a separate fulfillment lane after the canary private allocation ledger write closeout.

This preflight confirms the canary allocation is reserved and ledger-closed before any future fulfillment packet is allowed to be shaped.

## Required upstream state

- private allocation ledger write post-write closeout is sealed
- private allocation ledger contains exactly one matching canary allocation row
- duplicate allocation ledger append refuses
- inventory remaining after reserve is zero
- existing fulfillment live-path holds remain hold-only
- no signer authority is enabled
- no wallet signing is enabled
- no VOID transfer is enabled

## Boundary

Private/operator-only.

This preflight does not execute fulfillment.
This preflight does not create a fulfillment record.
This preflight does not create an allocation claim.
This preflight does not create a transfer instruction.
This preflight does not authorize a signer.
This preflight does not sign a wallet transaction.
This preflight does not transfer VOID.
This preflight does not broadcast a transaction.
This preflight does not create a public mutation route.
This preflight does not authorize buyer execution.
This preflight does not perform money movement.

## Allowed state

`separate_fulfillment_lane_preflight_green_pending_packet_hold`

## Next lane

A separate fulfillment packet hold may be shaped after this preflight.

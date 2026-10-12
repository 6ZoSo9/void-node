# USDC/VOID Buy Pool Automatic Payment Canary Separate Transfer Instruction Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TRANSFER_INSTRUCTION_HOLD_V1`

## Purpose

Define a private/operator-only transfer instruction hold for the canary separate fulfillment lane after execution authorization.

This hold shapes an instruction envelope for a future transfer lane. It does not sign, broadcast, transfer VOID, or mark fulfillment complete.

## Required upstream state

- separate fulfillment execution authorization hold is green
- separate fulfillment operator approval gate is green
- separate fulfillment packet hold is green
- separate fulfillment lane preflight is green
- private allocation ledger write post-write closeout is sealed
- fulfillment amount equals reserved VOID amount
- destination binding remains withheld private/operator-only
- no wallet address is exposed
- no wallet secret is exposed
- no signer authority is enabled
- no wallet signing is enabled
- no VOID transfer is enabled

## Boundary

Private/operator-only.

This transfer instruction hold does not execute fulfillment.
This transfer instruction hold does not create a fulfillment record.
This transfer instruction hold does not create an allocation claim.
This transfer instruction hold does not authorize a signer.
This transfer instruction hold does not expose wallet secrets.
This transfer instruction hold does not expose a wallet address.
This transfer instruction hold does not sign a wallet transaction.
This transfer instruction hold does not transfer VOID.
This transfer instruction hold does not broadcast a transaction.
This transfer instruction hold does not create a public mutation route.
This transfer instruction hold does not authorize buyer execution.
This transfer instruction hold does not perform money movement.
This transfer instruction hold does not mark fulfilled.

## Allowed states

- `held_pending_transfer_instruction`
- `transfer_instruction_held_pending_signer_authorization_lane`

## Next lane

A separate signer authorization hold may be shaped after this transfer instruction hold.

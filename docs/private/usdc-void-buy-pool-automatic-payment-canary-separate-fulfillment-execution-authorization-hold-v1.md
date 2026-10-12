# USDC/VOID Buy Pool Automatic Payment Canary Separate Fulfillment Execution Authorization Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_EXECUTION_AUTHORIZATION_HOLD_V1`

## Purpose

Define a private/operator-only execution authorization hold for the canary separate fulfillment packet after operator approval.

This hold authorizes only the next separate transfer-instruction lane to be shaped. It does not execute fulfillment.

## Required upstream state

- separate fulfillment operator approval gate is green
- separate fulfillment packet hold is green
- separate fulfillment lane preflight is green
- private allocation ledger write post-write closeout is sealed
- private allocation ledger contains exactly one matching canary allocation row
- fulfillment amount equals reserved VOID amount
- destination binding remains withheld private/operator-only
- no wallet address is exposed
- no wallet secret is exposed
- no signer authority is enabled
- no wallet signing is enabled
- no VOID transfer is enabled

## Boundary

Private/operator-only.

This execution authorization hold does not execute fulfillment.
This execution authorization hold does not create a fulfillment record.
This execution authorization hold does not create an allocation claim.
This execution authorization hold does not create a transfer instruction.
This execution authorization hold does not authorize a signer.
This execution authorization hold does not expose wallet secrets.
This execution authorization hold does not expose a wallet address.
This execution authorization hold does not sign a wallet transaction.
This execution authorization hold does not transfer VOID.
This execution authorization hold does not broadcast a transaction.
This execution authorization hold does not create a public mutation route.
This execution authorization hold does not authorize buyer execution.
This execution authorization hold does not perform money movement.

## Allowed states

- `held_pending_execution_authorization`
- `authorized_for_separate_transfer_instruction_lane`

## Next lane

A separate transfer instruction hold may be shaped after execution authorization.

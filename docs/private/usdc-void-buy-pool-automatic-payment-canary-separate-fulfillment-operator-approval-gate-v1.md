# USDC/VOID Buy Pool Automatic Payment Canary Separate Fulfillment Operator Approval Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_OPERATOR_APPROVAL_GATE_V1`

## Purpose

Define a private/operator-only approval gate for the canary separate fulfillment packet hold.

This gate can approve the already-shaped private fulfillment packet for the next separate fulfillment execution authorization lane.

## Required upstream state

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

This approval gate does not execute fulfillment.
This approval gate does not create a fulfillment record.
This approval gate does not create an allocation claim.
This approval gate does not create a transfer instruction.
This approval gate does not authorize a signer.
This approval gate does not expose wallet secrets.
This approval gate does not expose a wallet address.
This approval gate does not sign a wallet transaction.
This approval gate does not transfer VOID.
This approval gate does not broadcast a transaction.
This approval gate does not create a public mutation route.
This approval gate does not authorize buyer execution.
This approval gate does not perform money movement.

## Allowed states

- `held_pending_operator_approval`
- `approved_for_separate_fulfillment_execution_authorization_lane`

## Next lane

A separate fulfillment execution authorization lane may be shaped after approval.

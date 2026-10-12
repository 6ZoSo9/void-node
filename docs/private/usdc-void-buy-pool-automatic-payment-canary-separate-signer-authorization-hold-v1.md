# USDC/VOID Buy Pool Automatic Payment Canary Separate Signer Authorization Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_SIGNER_AUTHORIZATION_HOLD_V1`

## Purpose

Define a private/operator-only signer authorization hold for the canary separate fulfillment lane after the transfer instruction hold.

This hold shapes a signer authorization envelope for a future operator execute lane. It does not grant signer access, expose wallet material, sign, broadcast, transfer VOID, or mark fulfillment complete.

## Required upstream state

- separate transfer instruction hold is green
- separate fulfillment execution authorization hold is green
- separate fulfillment operator approval gate is green
- separate fulfillment packet hold is green
- separate fulfillment lane preflight is green
- private allocation ledger write post-write closeout is sealed
- transfer amount equals reserved VOID amount
- destination binding remains withheld private/operator-only
- no wallet address is exposed
- no wallet secret is exposed
- no signer access is enabled
- no wallet signing is enabled
- no VOID transfer is enabled

## Boundary

Private/operator-only.

This signer authorization hold does not execute fulfillment.
This signer authorization hold does not create a fulfillment record.
This signer authorization hold does not create an allocation claim.
This signer authorization hold does not expose wallet secrets.
This signer authorization hold does not expose a wallet address.
This signer authorization hold does not expose a private key.
This signer authorization hold does not expose a seed phrase.
This signer authorization hold does not grant signer access.
This signer authorization hold does not sign a wallet transaction.
This signer authorization hold does not transfer VOID.
This signer authorization hold does not broadcast a transaction.
This signer authorization hold does not create a public mutation route.
This signer authorization hold does not authorize buyer execution.
This signer authorization hold does not perform money movement.
This signer authorization hold does not mark fulfilled.

## Allowed states

- `held_pending_signer_authorization`
- `signer_authorization_held_pending_operator_execute_lane`

## Next lane

A separate operator execute hold may be shaped after this signer authorization hold.

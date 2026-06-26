# USDC/VOID Buy Pool Automatic Payment Canary Separate Operator Execute Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_OPERATOR_EXECUTE_HOLD_V1`

## Purpose

Define a private/operator-only operator execute hold for the canary separate fulfillment lane after signer authorization.

This hold shapes an operator execute envelope for a future actual execute gate. It does not grant signer access, expose wallet material, sign, broadcast, transfer VOID, create a fulfillment record, create an allocation claim, or mark fulfillment complete.

## Required upstream state

- separate signer authorization hold is green
- separate transfer instruction hold is green
- separate fulfillment execution authorization hold is green
- separate fulfillment operator approval gate is green
- separate fulfillment packet hold is green
- separate fulfillment lane preflight is green
- private allocation ledger write post-write closeout is sealed
- transfer amount equals reserved VOID amount
- destination binding remains withheld private/operator-only
- signer binding remains withheld private/operator-only
- no wallet address is exposed
- no wallet secret is exposed
- no private key is exposed
- no seed phrase is exposed
- no signer access is enabled
- no wallet signing is enabled
- no VOID transfer is enabled

## Boundary

Private/operator-only.

This operator execute hold does not execute fulfillment.
This operator execute hold does not create a fulfillment record.
This operator execute hold does not create an allocation claim.
This operator execute hold does not expose wallet secrets.
This operator execute hold does not expose a wallet address.
This operator execute hold does not expose a private key.
This operator execute hold does not expose a seed phrase.
This operator execute hold does not grant signer access.
This operator execute hold does not sign a wallet transaction.
This operator execute hold does not transfer VOID.
This operator execute hold does not broadcast a transaction.
This operator execute hold does not create a public mutation route.
This operator execute hold does not authorize buyer execution.
This operator execute hold does not perform money movement.
This operator execute hold does not mark fulfilled.

## Allowed states

- `held_pending_operator_execute_packet`
- `operator_execute_packet_held_pending_actual_execute_gate`

## Next lane

A separate actual execute gate may be shaped only after this hold remains green.

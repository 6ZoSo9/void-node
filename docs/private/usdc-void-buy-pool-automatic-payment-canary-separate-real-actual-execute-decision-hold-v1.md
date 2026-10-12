# USDC/VOID Buy Pool Automatic Payment Canary Separate Real Actual Execute Decision Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_REAL_ACTUAL_EXECUTE_DECISION_HOLD_V1`

## Purpose

Define a private/operator-only real actual execute decision hold for the canary separate fulfillment lane after the actual execute gate hold.

This records a decision envelope only. It may approve shaping the next separate real execute packet, but it does not grant signer access, expose wallet material, sign, broadcast, transfer VOID, create a fulfillment record, create an allocation claim, or mark fulfillment complete.

## Boundary

Private/operator-only.

This real actual execute decision hold does not execute fulfillment.
This real actual execute decision hold does not create a fulfillment record.
This real actual execute decision hold does not create an allocation claim.
This real actual execute decision hold does not expose wallet secrets.
This real actual execute decision hold does not expose a wallet address.
This real actual execute decision hold does not expose a private key.
This real actual execute decision hold does not expose a seed phrase.
This real actual execute decision hold does not grant signer access.
This real actual execute decision hold does not sign a wallet transaction.
This real actual execute decision hold does not transfer VOID.
This real actual execute decision hold does not broadcast a transaction.
This real actual execute decision hold does not create a public mutation route.
This real actual execute decision hold does not authorize buyer execution.
This real actual execute decision hold does not perform money movement.
This real actual execute decision hold does not mark fulfilled.

## Allowed states

- `held_pending_real_actual_execute_decision`
- `real_actual_execute_decision_held_pending_execute_packet_shape`

## Next lane

A separate real actual execute packet hold may be shaped only after this decision hold remains green.

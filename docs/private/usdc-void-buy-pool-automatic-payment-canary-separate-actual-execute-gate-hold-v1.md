# USDC/VOID Buy Pool Automatic Payment Canary Separate Actual Execute Gate Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_ACTUAL_EXECUTE_GATE_HOLD_V1`

## Purpose

Define a private/operator-only actual execute gate hold for the canary separate fulfillment lane after operator execute packet hold.

This is a gate shape only. It does not grant signer access, expose wallet material, sign, broadcast, transfer VOID, create a fulfillment record, create an allocation claim, or mark fulfillment complete.

## Boundary

Private/operator-only.

This actual execute gate hold does not execute fulfillment.
This actual execute gate hold does not create a fulfillment record.
This actual execute gate hold does not create an allocation claim.
This actual execute gate hold does not expose wallet secrets.
This actual execute gate hold does not expose a wallet address.
This actual execute gate hold does not expose a private key.
This actual execute gate hold does not expose a seed phrase.
This actual execute gate hold does not grant signer access.
This actual execute gate hold does not sign a wallet transaction.
This actual execute gate hold does not transfer VOID.
This actual execute gate hold does not broadcast a transaction.
This actual execute gate hold does not create a public mutation route.
This actual execute gate hold does not authorize buyer execution.
This actual execute gate hold does not perform money movement.
This actual execute gate hold does not mark fulfilled.

## Allowed states

- `held_pending_actual_execute_gate`
- `actual_execute_gate_held_pending_real_execute_decision`

## Next lane

A real actual execute decision must be separate, explicit, private/operator-only, and separately proven.

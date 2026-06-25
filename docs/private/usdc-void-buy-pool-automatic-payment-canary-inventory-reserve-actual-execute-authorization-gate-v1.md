# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Actual Execute Authorization Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_GATE_V1`

## Purpose

Authorize one automatic payment canary inventory reserve dry-run result for a separate actual execute step.

This is the final private operator authorization gate before any inventory reserve mutation.

## Boundary

Private/operator-only.

This gate may approve, hold, or reject a dry-run result for separate actual inventory reserve execution.

This gate does not reserve inventory.
This gate does not decrement inventory.
This gate does not create an allocation record.
This gate does not write the private allocation ledger.
This gate does not execute fulfillment.
This gate does not sign a wallet transaction.
This gate does not transfer VOID.
This gate does not expose private operator material.
This gate does not create a public mutation route.

## Allowed decisions

- authorize_separate_actual_inventory_reserve_execute
- hold_for_operator_review
- reject_actual_inventory_reserve_execute

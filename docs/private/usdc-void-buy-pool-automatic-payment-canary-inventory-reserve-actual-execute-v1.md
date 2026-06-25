# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Actual Execute v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_V1`

## Purpose

Perform the first narrow private automatic payment canary inventory reserve mutation.

This consumes a pre-execute backup snapshot and records that the canary inventory reserve/decrement occurred.

## Boundary

Private/operator-only.

This execute may reserve and decrement canary inventory for one candidate.

This execute does not create an allocation record.
This execute does not write the private allocation ledger.
This execute does not execute fulfillment.
This execute does not sign a wallet transaction.
This execute does not transfer VOID.
This execute does not expose private operator material.
This execute does not create a public mutation route.

## Required input

A pre-execute backup snapshot where:

- backup snapshot state is `pre_execute_backup_snapshot_created`
- backup snapshot status is `created_pending_separate_actual_inventory_reserve_execute`
- restore target exists
- execute boundary requires separate actual execute

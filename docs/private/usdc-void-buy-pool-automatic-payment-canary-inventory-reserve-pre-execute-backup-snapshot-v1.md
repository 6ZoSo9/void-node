# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Pre-Execute Backup Snapshot v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_V1`

## Purpose

Create a private operator-only pre-execute backup snapshot before the first actual canary inventory reserve mutation.

This snapshot records the authorized dry-run result and the expected inventory state before any actual reserve or decrement.

## Boundary

Private/operator-only.

This snapshot may create a backup snapshot object.

This snapshot does not reserve inventory.
This snapshot does not decrement inventory.
This snapshot does not create an allocation record.
This snapshot does not write the private allocation ledger.
This snapshot does not execute fulfillment.
This snapshot does not sign a wallet transaction.
This snapshot does not transfer VOID.
This snapshot does not expose private operator material.
This snapshot does not create a public mutation route.

## Required input

An actual execute authorization output where:

- authorization state is `authorized_for_separate_actual_inventory_reserve_execute`
- authorized_for_separate_actual_inventory_reserve_execute is true
- dry-run result status is `ready_for_separate_actual_execute_review`
- actual inventory mutation performed is false

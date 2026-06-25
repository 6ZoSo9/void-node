# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Execution Dry-Run v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_DRY_RUN_V1`

## Purpose

Dry-run one private automatic payment canary inventory reserve execution packet.

This computes the proposed before/after inventory state without writing or mutating inventory.

## Boundary

Private/operator-only.

This dry-run may compute a proposed reserve result.

This dry-run does not reserve inventory.
This dry-run does not decrement inventory.
This dry-run does not create an allocation record.
This dry-run does not write the private allocation ledger.
This dry-run does not execute fulfillment.
This dry-run does not sign a wallet transaction.
This dry-run does not transfer VOID.
This dry-run does not expose private operator material.
This dry-run does not create a public mutation route.

## Required input

An inventory reserve execution packet hold output where:

- reserve execution packet shape is created
- packet kind is `automatic_payment_canary_inventory_reserve_execution_packet`
- packet status is `held_shape_only_pending_separate_execute`
- execute boundary says this packet does not execute now

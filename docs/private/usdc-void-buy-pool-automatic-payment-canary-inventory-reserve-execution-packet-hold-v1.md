# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Execution Packet Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_HOLD_V1`

## Purpose

Define the private operator-only execution packet shape for one canary inventory reserve.

This packet is prepared only after inventory reserve operator approval.

## Boundary

Private/operator-only.

This hold may create a reserve execution packet shape.

This hold does not reserve inventory.
This hold does not decrement inventory.
This hold does not create an allocation record.
This hold does not write the private allocation ledger.
This hold does not execute fulfillment.
This hold does not sign a wallet transaction.
This hold does not transfer VOID.
This hold does not expose private operator material.
This hold does not create a public mutation route.

## Required input

An inventory reserve operator approval output where:

- approved_for_separate_inventory_reserve_execution_packet is true
- inventory reserve candidate kind is `automatic_payment_canary_inventory_reserve_candidate`
- inventory reserve candidate status is `eligible_pending_operator_actual_reserve`

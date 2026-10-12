# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Operator Approval Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_GATE_V1`

## Purpose

Add a private operator approval gate after inventory reserve candidate preflight.

This gate approves, holds, or rejects one inventory reserve candidate before any actual inventory reserve or decrement.

## Boundary

Private/operator-only.

This gate may approve one inventory reserve candidate for a future separate reserve execution packet.

This gate does not reserve inventory.
This gate does not decrement inventory.
This gate does not create an allocation record.
This gate does not write the private allocation ledger.
This gate does not execute fulfillment.
This gate does not sign a wallet transaction.
This gate does not transfer VOID.
This gate does not expose private operator material.
This gate does not create a public mutation route.

## Allowed operator decisions

- approve_for_separate_inventory_reserve_execution_packet
- hold_for_operator_review
- reject_inventory_reserve_candidate

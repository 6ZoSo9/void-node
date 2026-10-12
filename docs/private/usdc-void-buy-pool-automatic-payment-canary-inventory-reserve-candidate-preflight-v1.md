# USDC/VOID Buy Pool Automatic Payment Canary Inventory Reserve Candidate Preflight v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_CANDIDATE_PREFLIGHT_V1`

## Purpose

Preflight one automatic payment canary allocation candidate for inventory reserve eligibility.

This creates an inventory-reserve candidate decision only.

## Boundary

Private/operator-only.

This preflight may determine whether one allocation candidate is eligible for a future inventory reserve step.

This preflight does not reserve inventory.
This preflight does not decrement inventory.
This preflight does not create an allocation record.
This preflight does not write the private allocation ledger.
This preflight does not execute fulfillment.
This preflight does not sign a wallet transaction.
This preflight does not transfer VOID.
This preflight does not expose private operator material.
This preflight does not create a public mutation route.

## Required input

An allocation candidate gate output where:

- allocation_candidate_created is true
- allocation candidate kind is `automatic_payment_canary_allocation_candidate`
- allocation candidate status is `created_pending_inventory_reserve_gate`
- canary candidate limit is 1
- requested VOID amount is within remaining canary inventory policy

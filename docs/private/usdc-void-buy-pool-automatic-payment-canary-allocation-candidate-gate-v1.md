# USDC/VOID Buy Pool Automatic Payment Canary Allocation Candidate Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_CANDIDATE_GATE_V1`

## Purpose

Create the private operator-only allocation-candidate gate after canary candidate review approval.

This gate converts one approved reviewed canary payment candidate into an allocation-candidate object.

## Boundary

Private/operator-only.

This gate may create one allocation-candidate object.

This gate does not create an allocation record.
This gate does not write the private allocation ledger.
This gate does not reserve inventory.
This gate does not execute fulfillment.
This gate does not sign a wallet transaction.
This gate does not transfer VOID.
This gate does not expose private operator material.
This gate does not create a public mutation route.

## Required input

A candidate review gate output where:

- review state is `approved_for_allocation_candidate`
- approved_for_allocation_candidate is true
- candidate kind is `automatic_payment_canary_candidate`
- canary remains one-candidate only

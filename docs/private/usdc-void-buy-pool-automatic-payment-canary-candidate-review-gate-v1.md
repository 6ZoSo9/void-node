# USDC/VOID Buy Pool Automatic Payment Canary Candidate Review Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_REVIEW_GATE_V1`

## Purpose

Add a private operator review gate after the classifier-to-candidate-builder bridge.

The gate reviews one built automatic payment canary candidate before any inventory reserve, private ledger write, fulfillment execution, wallet signing, or VOID transfer step.

## Boundary

Private/operator-only.

This gate may approve, hold, or reject one built canary candidate for the next allocation-candidate stage.

This gate does not write the allocation ledger.
This gate does not reserve inventory.
This gate does not execute fulfillment.
This gate does not sign a wallet transaction.
This gate does not transfer VOID.
This gate does not expose operator material.
This gate does not create a public mutation route.

## Allowed review decisions

- approve_for_allocation_candidate
- hold_for_operator_review
- reject_candidate

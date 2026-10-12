# USDC/VOID Buy Pool Automatic Payment Canary Classifier to Candidate Builder Bridge v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CLASSIFIER_TO_CANDIDATE_BUILDER_BRIDGE_V1`

## Purpose

Bridge the private RPC outcome classifier to the private canary candidate builder.

The candidate builder may run only when the classifier state is `eligible_candidate_path`.

## Boundary

Private/operator-only.

This bridge does not call RPC.
This bridge does not write a ledger.
This bridge does not reserve inventory.
This bridge does not execute fulfillment.
This bridge does not sign a wallet transaction.
This bridge does not transfer VOID.
This bridge does not expose secrets.
This bridge does not create a public mutation route.

## Rule

- `eligible_candidate_path` -> candidate builder allowed
- held states -> candidate builder blocked, retry/review required
- rejected states -> candidate builder blocked, rejection/review required

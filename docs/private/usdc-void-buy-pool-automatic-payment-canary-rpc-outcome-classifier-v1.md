# USDC/VOID Buy Pool Automatic Payment Canary RPC Outcome Classifier v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_OUTCOME_CLASSIFIER_V1`

## Purpose

Classify one operator-provided RPC observation result before automatic payment canary candidate building.

This bridges the RPC rate-limit hold policy into the private canary candidate path.

## Boundary

Private/operator-only.

This classifier does not call RPC.
This classifier does not build a payment candidate.
This classifier does not write a ledger.
This classifier does not reserve inventory.
This classifier does not execute fulfillment.
This classifier does not sign a wallet transaction.
This classifier does not transfer VOID.
This classifier does not expose secrets.
This classifier does not create a public mutation route.

## Output classes

- eligible_candidate_path
- pending_not_mined_or_not_indexed
- held_rpc_access_blocked
- held_rpc_rate_limited
- held_rpc_timeout
- held_rpc_error
- rejected_wrong_chain
- rejected_wrong_token
- rejected_wrong_receiver
- rejected_duplicate_payment_identity

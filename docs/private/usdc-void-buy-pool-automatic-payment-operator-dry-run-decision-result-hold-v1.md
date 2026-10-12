# USDC/VOID Buy Pool Automatic Payment Operator Dry-Run Decision Result Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_RESULT_HOLD_V1`

## Purpose

This private operator-only hold defines the dry-run decision result record shape for the USDC/VOID automatic payment path.

It follows:

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1`

This is not an activation artifact.

## Boundary

This hold may describe how an operator would record a dry-run decision result, but it does not allow:

- automatic payment execution
- automatic fulfillment
- wallet fulfillment
- signer access
- treasury transfer authority
- buyer execution
- public mutation
- private allocation ledger write
- inventory reserve/decrement
- allocation claim creation
- VOID transfer

## Allowed dry-run result states

- `operator_dry_run_not_evaluated`
- `operator_dry_run_candidate_eligible`
- `operator_dry_run_candidate_rejected`
- `operator_dry_run_candidate_held_manual_review`
- `operator_dry_run_blocked_missing_verified_payment`
- `operator_dry_run_blocked_duplicate_payment`
- `operator_dry_run_blocked_inventory`
- `operator_dry_run_blocked_identity_mismatch`
- `operator_dry_run_blocked_amount_rate_policy`
- `operator_dry_run_blocked_finality`

## Public exposure

No public route is created by this hold.

No buyer-specific private values, receiver paths, ledger paths, tx hashes, wallet keys, signer material, allocation records, or execution commands are exposed.


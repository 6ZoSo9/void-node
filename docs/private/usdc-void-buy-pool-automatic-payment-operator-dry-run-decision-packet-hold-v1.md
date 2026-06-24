# USDC/VOID automatic payment operator dry-run decision packet hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1`

This is a **private operator-only hold** for the first automatic-payment dry-run decision packet.

It does not make automatic payment work yet.

It defines the private packet shape for answering:

> Given a verified USDC receipt candidate, would this payment qualify for automatic-payment eligibility?

The answer remains dry-run only. No state mutation is authorized.

## Boundary

This packet does not authorize:

- payment approval
- allocation claim creation
- private allocation ledger write
- inventory reserve
- inventory decrement
- fulfillment record creation
- wallet fulfillment
- signer access
- treasury transfer authority
- automatic VOID transfer
- public mutation

## Canonical duplicate identity

Payment identity must be:

`chain_id:tx_hash:transfer_log_index`

`request_id` alone is not a payment identity.

## Allowed decision states

- `blocked_missing_receipt`
- `blocked_receipt_status_not_success`
- `blocked_transfer_log_missing`
- `blocked_chain_token_receiver_allowlist`
- `blocked_finality_confirmations`
- `blocked_duplicate_payment_identity`
- `blocked_amount_rate_policy`
- `blocked_buyer_identity_binding`
- `blocked_inventory_capacity`
- `candidate_payment_eligible_dry_run_only`
- `blocked_authority_false`

## Public prerequisite references

- `VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1`
- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1`
- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1`
- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1`

## Status

Private shape only. Held. No public route. No automatic execution.

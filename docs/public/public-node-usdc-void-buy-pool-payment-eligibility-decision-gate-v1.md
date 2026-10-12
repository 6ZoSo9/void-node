# USDC/VOID Buy Pool Payment Eligibility Decision Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1

Purpose: combine the already sealed buy-pool gates into one public read-only payment eligibility decision policy.

This gate does not verify a live payment and does not fulfill anything.

Inputs:

- Chain/token/receiver allowlist gate
- Amount/rate policy gate
- Duplicate payment guard gate
- Buyer identity binding gate
- Finality/confirmations gate

Decision states:

- payment_eligibility_candidate_ready
- hold_chain_token_receiver_not_allowed
- hold_amount_rate_invalid
- hold_duplicate_payment_candidate
- hold_buyer_identity_missing_or_conflicting
- hold_finality_confirmations_not_met
- reject_failed_receipt
- reject_missing_transfer_log
- operator_review_required

Policy:

A payment candidate may only become policy-ready when every upstream gate is green and the candidate is not in a hold or reject state.

Even when policy-ready, this public gate does not create an allocation claim, does not write a ledger, does not reserve inventory, does not automatically fulfill, and does not transfer VOID.

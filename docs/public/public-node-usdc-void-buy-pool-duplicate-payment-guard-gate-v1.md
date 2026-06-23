# USDC/VOID Buy Pool Duplicate Payment Guard Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1

Purpose: prove the duplicate-prevention policy required before automatic payment handling can safely create any future allocation candidate from an observed USDC transfer.

This gate is green for duplicate guard policy only.

Duplicate key policy:

- Primary payment event key: chain_id + tx_hash + transfer_log_index
- Candidate claim key: chain_id + tx_hash + transfer_log_index + receiver + token_address + buyer_binding_key
- Same payment event key cannot be counted twice.
- Same candidate claim key cannot create two allocation claims.
- Same tx_hash can contain multiple transfer logs, but each transfer log must be identified by transfer_log_index.
- Cross-chain tx_hash collisions are separated by chain_id.
- If duplicate status is unclear, operator review is required.

Duplicate states:

- new_payment_candidate
- duplicate_same_chain_tx_log_index_blocked
- duplicate_same_candidate_claim_key_blocked
- duplicate_same_tx_without_log_index_hold
- duplicate_conflicting_buyer_binding_hold
- duplicate_conflicting_amount_hold
- operator_review_required

Gate result:

- duplicate_payment_guard_gate_green: true
- primary_event_key_policy_green: true
- candidate_claim_key_policy_green: true
- duplicate_rejection_policy_green: true
- ambiguous_duplicate_hold_policy_green: true

Non-authority statement:

This gate does not verify a real payment now, does not fetch live chain data now, does not approve a buyer, does not write a private allocation ledger, does not reserve inventory, does not enable automatic fulfillment, and does not transfer VOID.

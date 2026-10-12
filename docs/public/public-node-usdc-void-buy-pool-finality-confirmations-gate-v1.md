# USDC/VOID Buy Pool Finality + Confirmations Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1

Purpose: prove the finality/confirmation policy required before automatic payment handling can treat an observed USDC transfer candidate as eligible for later allocation review.

This gate is green for finality policy only.

Policy:

- Ethereum mainnet requires at least 12 confirmations before a candidate can advance.
- Base mainnet requires at least 30 confirmations before a candidate can advance.
- Receipt status must be successful.
- Transfer log must remain present at or beyond the required confirmation depth.
- Chain head must be known from a trusted reader before finality can be claimed.
- Reorg risk, missing block number, missing receipt, missing status, or missing transfer log forces hold.
- This gate defines policy only; it does not fetch live chain data now and does not verify finality now.

Finality states:

- finality_policy_candidate_ready
- confirmations_below_threshold_hold
- receipt_status_failed_hold
- receipt_missing_hold
- transfer_log_missing_hold
- chain_head_unknown_hold
- block_number_missing_hold
- reorg_risk_hold
- unsupported_chain_hold
- operator_review_required

Gate result:

- finality_confirmations_gate_green: true
- chain_confirmation_thresholds_green: true
- receipt_success_policy_green: true
- transfer_log_persistence_policy_green: true
- reorg_hold_policy_green: true

Non-authority statement:

This gate does not verify a real payment now, does not fetch live chain data now, does not approve a buyer, does not write a private allocation ledger, does not reserve inventory, does not enable automatic fulfillment, and does not transfer VOID.

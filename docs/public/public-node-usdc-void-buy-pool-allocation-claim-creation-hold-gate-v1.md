# USDC/VOID Buy Pool Allocation Claim Creation Hold Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1

Purpose: define the exact public-safe allocation claim shape and hold policy after a payment candidate becomes policy-eligible.

This gate is a hold gate. It does not create an allocation claim now.

Inputs:

- Payment eligibility decision gate
- Buyer identity binding gate
- Amount/rate policy gate
- Duplicate payment guard gate
- Finality/confirmations gate

Claim shape:

- claim_id: deterministic public-safe id derived from chain id, tx hash, transfer log index, buyer binding key, receiver, token, and rate policy version
- buyer_binding_key: opaque public-safe identifier only
- receiving_void_address: public receiving address
- chain_id
- tx_hash
- transfer_log_index
- token_address
- receiver_address
- usdc_amount_micro
- void_amount
- rate_policy_version
- eligibility_decision_state
- allocation_claim_state

Hold states:

- allocation_claim_creation_hold
- blocked_payment_not_eligible
- blocked_duplicate_payment
- blocked_buyer_identity_missing_or_conflicting
- blocked_finality_not_met
- blocked_amount_rate_invalid
- blocked_inventory_not_reserved
- operator_review_required

Authority:

No claim is created now, no private ledger is written, no inventory is reserved, no automatic fulfillment is enabled, and no VOID transfer occurs.

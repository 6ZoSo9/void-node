# USDC/VOID Buy Pool Buyer Packet Duplicate Payment Guard Check Result Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_DUPLICATE_PAYMENT_GUARD_CHECK_RESULT_HOLD_V1

Purpose: define a private/operator-only hold shape for recording the result of checking an amount/rate-policy-passed candidate against the duplicate payment guard.

This is duplicate-payment guard check result recording only.

It requires the prior private amount/rate policy check result state:

- amount_rate_policy_check_recorded_unverified

It may record that an operator-controlled duplicate-payment guard check result exists for:

- transaction hash fingerprint
- chain/payment fingerprint
- prior payment lookup reference
- duplicate match count
- idempotency key
- duplicate found flag
- duplicate guard passed flag

It does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
- buyer identity binding
- finality confirmations
- payment eligibility decision
- operator approval
- allocation claim creation
- inventory reservation
- wallet action
- VOID transfer
- automatic fulfillment
- operator authority activation

Allowed duplicate-payment guard check result hold states:

- draft_hold
- blocked_amount_rate_policy_check_result_not_ready
- blocked_payment_fingerprint_missing
- duplicate_payment_detected_hold
- duplicate_payment_guard_check_recorded_unverified
- held_for_buyer_identity_binding_check

Duplicate-payment guard check result shape:

- duplicate guard check result id
- amount/rate policy check result id
- allowlist check result id
- parse result id
- receipt read result id
- work item id
- chain
- transaction hash
- payment fingerprint
- prior payment lookup reference
- duplicate match count
- duplicate found flag
- duplicate guard passed flag
- idempotency key

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed
- no raw RPC payload is published

Current state:

- buyer_packet_duplicate_payment_guard_check_result_hold_green
- private_operator_only
- duplicate_payment_guard_check_result_recording_only
- no_public_route
- no_buyer_identity_binding
- no_finality_confirmations
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

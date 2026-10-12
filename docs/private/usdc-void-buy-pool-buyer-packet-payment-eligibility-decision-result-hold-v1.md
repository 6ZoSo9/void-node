# USDC/VOID Buy Pool Buyer Packet Payment Eligibility Decision Result Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_ELIGIBILITY_DECISION_RESULT_HOLD_V1

Purpose: define a private/operator-only hold shape for recording a payment eligibility decision after finality confirmations have been recorded.

This is payment eligibility decision result recording only.

It requires the prior private finality confirmations check result state:

- finality_confirmations_check_recorded_unverified

It may record that an operator-controlled payment eligibility decision result exists for:

- finality confirmations result reference
- buyer identity binding result reference
- duplicate payment guard result reference
- amount/rate policy result reference
- chain/token/receiver allowlist result reference
- Transfer log parse result reference
- receipt read result reference
- payment eligible flag
- eligibility decision state
- eligibility reason codes

It does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
- operator approval
- allocation claim creation
- inventory reservation
- wallet action
- VOID transfer
- automatic fulfillment
- operator authority activation

Allowed payment eligibility decision result hold states:

- draft_hold
- blocked_finality_confirmations_check_result_not_ready
- blocked_required_private_check_result_missing
- payment_ineligible_hold
- payment_eligibility_decision_recorded_unverified
- held_for_operator_review_or_claim_creation_boundary

Payment eligibility decision result shape:

- payment eligibility decision result id
- finality confirmations check result id
- buyer identity binding check result id
- duplicate payment guard check result id
- amount/rate policy check result id
- allowlist check result id
- parse result id
- receipt read result id
- work item id
- payment eligible flag
- eligibility decision state
- eligibility reason codes
- claim creation candidate flag

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed
- no raw RPC payload is published
- no buyer contact details are published

Current state:

- buyer_packet_payment_eligibility_decision_result_hold_green
- private_operator_only
- payment_eligibility_decision_result_recording_only
- no_public_route
- no_operator_approval
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

# USDC/VOID Buy Pool Buyer Packet Private Intake Receipt Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_RECEIPT_HOLD_V1

Purpose: define a private/operator-only receipt hold shape for a buyer manual review packet received through a separate private intake channel.

This is private intake bookkeeping only.

It is not:

- public-node intake
- public submission
- payment verification
- payment eligibility approval
- duplicate payment approval
- buyer identity approval
- allocation claim creation
- inventory reservation
- VOID transfer
- wallet action
- automatic fulfillment
- operator authority activation

Allowed receipt hold states:

- draft_hold
- received_private_packet_unverified
- blocked_missing_required_fields
- blocked_public_submission_attempt
- queued_for_manual_review

Required buyer packet fields:

- chain
- transaction hash
- USDC amount
- sending wallet address
- receiving VOID wallet address
- buyer manual-review acknowledgment

Private intake safety:

- keep private contact information private
- never record seed phrases
- never record private keys
- never record passwords
- never record secret material
- use redacted placeholders in fixtures and proofs

Current state:

- buyer_packet_private_intake_receipt_hold_green
- private_operator_receipt_shape_only
- no_public_submission
- no_payment_verification
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

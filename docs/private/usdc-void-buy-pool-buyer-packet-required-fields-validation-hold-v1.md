# USDC/VOID Buy Pool Buyer Packet Required Fields Validation Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_REQUIRED_FIELDS_VALIDATION_HOLD_V1

Purpose: define a private/operator-only hold shape for validating required field presence on a privately received buyer manual review packet.

This is field-presence validation only.

It confirms only whether the packet includes:

- chain
- transaction hash
- USDC amount
- sending wallet address
- receiving VOID wallet address
- buyer manual-review acknowledgment

It does not confirm:

- payment verification
- chain / token / receiver allowlist validity
- amount-rate policy validity
- duplicate payment status
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

Allowed validation hold states:

- draft_hold
- blocked_missing_chain
- blocked_missing_transaction_hash
- blocked_missing_usdc_amount
- blocked_missing_sending_wallet_address
- blocked_missing_receiving_void_wallet_address
- blocked_missing_buyer_acknowledgment
- required_fields_present_unverified
- queued_for_payment_verification_hold

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed

Current state:

- buyer_packet_required_fields_validation_hold_green
- field_presence_only
- private_operator_only
- no_public_route
- no_payment_verification
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

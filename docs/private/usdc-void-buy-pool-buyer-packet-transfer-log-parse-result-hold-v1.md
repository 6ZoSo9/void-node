# USDC/VOID Buy Pool Buyer Packet Transfer Log Parse Result Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_TRANSFER_LOG_PARSE_RESULT_HOLD_V1

Purpose: define a private/operator-only hold shape for recording the result of parsing ERC-20 Transfer log candidates from a private receipt-read result.

This is transfer-log parse result recording only.

It requires the prior private receipt-read result state:

- receipt_read_result_recorded_unverified

It may record that an operator-controlled Transfer log parse result exists, but it does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
- USDC contract allowlist verification
- receiver address verification
- amount-rate policy verification
- duplicate payment guard decision
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

Allowed transfer-log parse result hold states:

- draft_hold
- blocked_receipt_read_result_not_ready
- blocked_receipt_missing_logs
- transfer_log_parse_result_recorded_unverified
- held_for_chain_token_receiver_allowlist_check

Transfer log parse result shape:

- parse result id
- receipt read result id
- work item id
- queue record id
- receipt record id
- chain
- transaction hash
- Transfer topic checked flag
- Transfer log candidate found flag
- candidate emitting contract
- candidate from address
- candidate to address
- candidate value
- candidate log index

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed
- no raw RPC payload is published

Current state:

- buyer_packet_transfer_log_parse_result_hold_green
- private_operator_only
- transfer_log_parse_result_recording_only
- no_public_route
- no_public_node_transfer_log_parse
- no_usdc_allowlist_verification
- no_receiver_verification
- no_amount_rate_policy_verification
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

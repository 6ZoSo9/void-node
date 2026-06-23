# USDC/VOID Buy Pool Buyer Packet Payment Verification Work Item Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PAYMENT_VERIFICATION_WORK_ITEM_HOLD_V1

Purpose: define a private/operator-only work-item hold shape for preparing queued buyer packet payment verification.

This is verification work-item preparation only.

It requires the prior private queue hold state:

- queued_for_payment_verification_hold

It may prepare a private operator work item containing redacted inputs needed for later payment verification, but it does not perform:

- RPC receipt read
- receipt status verification
- ERC-20 Transfer log parsing
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

Allowed work item hold states:

- draft_hold
- blocked_queue_state_not_ready
- blocked_missing_verification_inputs
- payment_verification_work_item_prepared_hold
- held_for_operator_receipt_read

Work item input shape:

- chain
- transaction hash
- expected USDC amount
- expected receiver address
- expected USDC contract allowlist reference
- sending wallet address
- receiving VOID wallet address
- queue record id
- validation record id
- receipt record id

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed

Current state:

- buyer_packet_payment_verification_work_item_hold_green
- private_operator_only
- work_item_preparation_only
- no_public_route
- no_rpc_read
- no_transfer_log_parse
- no_payment_verification
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

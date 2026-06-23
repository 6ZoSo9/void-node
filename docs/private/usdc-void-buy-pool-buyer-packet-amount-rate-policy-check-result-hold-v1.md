# USDC/VOID Buy Pool Buyer Packet Amount Rate Policy Check Result Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_AMOUNT_RATE_POLICY_CHECK_RESULT_HOLD_V1

Purpose: define a private/operator-only hold shape for recording the result of checking an allowlisted Transfer log candidate against the USDC/VOID buy-pool amount and rate policy.

This is amount/rate policy check result recording only.

It requires the prior private allowlist check result state:

- chain_token_receiver_allowlist_check_recorded_unverified

It may record that an operator-controlled amount/rate policy check result exists for:

- observed USDC amount
- configured fixed rate
- computed VOID allocation
- minimum amount rule
- maximum amount rule
- decimal normalization rule

It does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
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

Allowed amount/rate policy check result hold states:

- draft_hold
- blocked_allowlist_check_result_not_ready
- blocked_amount_missing
- blocked_amount_below_minimum
- blocked_amount_above_maximum
- amount_rate_policy_check_recorded_unverified
- held_for_duplicate_payment_guard_check

Amount/rate policy check result shape:

- amount/rate check result id
- allowlist check result id
- parse result id
- receipt read result id
- work item id
- chain
- transaction hash
- observed USDC amount
- fixed rate policy reference
- computed VOID allocation
- amount minimum passed flag
- amount maximum passed flag
- decimal normalization passed flag
- amount/rate policy passed flag

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed
- no raw RPC payload is published

Current state:

- buyer_packet_amount_rate_policy_check_result_hold_green
- private_operator_only
- amount_rate_policy_check_result_recording_only
- no_public_route
- no_duplicate_guard_decision
- no_buyer_identity_binding
- no_finality_confirmations
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

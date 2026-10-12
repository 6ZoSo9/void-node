# USDC/VOID Buy Pool Buyer Packet Chain Token Receiver Allowlist Check Result Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_CHAIN_TOKEN_RECEIVER_ALLOWLIST_CHECK_RESULT_HOLD_V1

Purpose: define a private/operator-only hold shape for recording the result of checking a parsed Transfer log candidate against the USDC buy-pool chain, token, and receiver allowlist.

This is chain/token/receiver allowlist check result recording only.

It requires the prior private Transfer-log parse result state:

- transfer_log_parse_result_recorded_unverified

It may record that an operator-controlled allowlist check result exists for:

- chain allowlist
- token contract allowlist
- receiver address allowlist

It does not perform:

- public-node RPC receipt read
- public-node Transfer log parsing
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

Allowed allowlist check result hold states:

- draft_hold
- blocked_transfer_log_parse_result_not_ready
- blocked_chain_not_allowed
- blocked_token_contract_not_allowed
- blocked_receiver_not_allowed
- chain_token_receiver_allowlist_check_recorded_unverified
- held_for_amount_rate_policy_check

Allowlist check result shape:

- allowlist check result id
- parse result id
- receipt read result id
- work item id
- chain
- candidate token contract
- candidate receiver address
- chain allowlist reference
- token allowlist reference
- receiver allowlist reference
- chain allowed flag
- token contract allowed flag
- receiver allowed flag

Privacy rule:

- values stay private/operator-only
- fixtures use redacted placeholders
- no public route is created
- no public submission is accepted
- no public mutation is allowed
- no raw RPC payload is published

Current state:

- buyer_packet_chain_token_receiver_allowlist_check_result_hold_green
- private_operator_only
- allowlist_check_result_recording_only
- no_public_route
- no_amount_rate_policy_verification
- no_duplicate_guard_decision
- no_payment_eligibility_decision
- no_claim_creation
- no_inventory_reservation
- no_wallet_action
- no_void_transfer
- no_automatic_fulfillment

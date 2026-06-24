# USDC/VOID Automatic Payment Allocation Claim Creation Live-Path Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1

This is a private hold packet for the future automatic payment allocation claim creation live path.

It does not enable automatic payment execution. It does not enable fulfillment. It does not create allocation claims. It defines the allocation claim gates required before activation.

Linked prerequisite packets:

- Inventory reserve/decrement live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1
- Amount/rate policy live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1
- Verified receipt parser live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1
- Duplicate payment guard live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1

Allocation claim policy:

- claim creation requires verified receipt parser pass
- claim creation requires duplicate payment guard pass
- claim creation requires amount/rate policy pass
- claim creation requires inventory reserve/decrement policy pass
- claim key must bind buyer identity, payment key, reserve key, and derived VOID amount
- claim must be append-only
- duplicate claim key must reject
- claim amount must equal reserved/decremented amount
- claim cannot exist before reserve
- claim cannot create fulfillment authority
- claim cannot create wallet signing authority
- claim cannot transfer VOID

Required allocation claim gates:

- buyer identity binding present
- payment verification key present
- duplicate guard key present
- amount/rate result present
- reserve key present
- inventory reserve state present
- derived VOID amount present
- allocation claim key derivable
- allocation claim append-only guard present
- duplicate allocation claim rejection present
- fulfillment handoff remains disabled

Rejected allocation claim states:

- missing_buyer_identity_binding
- missing_payment_verification_key
- missing_duplicate_guard_key
- missing_amount_rate_result
- missing_reserve_key
- missing_inventory_reserve_state
- missing_derived_void_amount
- claim_amount_mismatch
- duplicate_allocation_claim_key
- claim_before_reserve
- claim_after_failed_payment
- claim_after_duplicate_payment
- claim_after_insufficient_inventory
- claim_with_wallet_authority
- claim_with_void_transfer_authority

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- allocation claim creation: false
- allocation claim append write: false
- fulfillment record write: false
- wallet signing: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

# USDC/VOID Automatic Payment Inventory Reserve/Decrement Live-Path Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1

This is a private hold packet for the future automatic payment inventory reserve/decrement live path.

It does not enable automatic payment execution. It does not enable fulfillment. It does not write inventory. It defines the inventory gates required before activation.

Linked prerequisite packets:

- Amount/rate policy live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1
- Verified receipt parser live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1
- Duplicate payment guard live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1
- Fulfillment wallet policy hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1

Inventory policy:

- buy pool inventory cap: 10,000,000 VOID
- reserve must happen before fulfillment
- decrement must happen only after verified payment gates pass
- allocation amount must come from amount/rate policy
- duplicate payment guard must bind to the same reserve key
- remaining inventory must never go below zero
- sold-out closeout is required when remaining inventory reaches zero
- oversell is rejected
- duplicate reserve is rejected

Required inventory gates:

- payment verified by receipt parser
- duplicate guard key passed
- amount/rate policy passed
- buyer identity binding present
- allocation amount deterministic
- current inventory snapshot present
- reserve key derivable
- remaining inventory after reserve non-negative
- reserve write gated
- decrement write gated
- sold-out closeout gated

Rejected inventory states:

- missing_inventory_snapshot
- missing_reserve_key
- duplicate_reserve_key
- duplicate_payment_key
- zero_allocation
- malformed_allocation
- allocation_amount_mismatch
- insufficient_inventory
- inventory_underflow
- sold_out_before_reserve
- decrement_without_reserve
- fulfillment_without_decrement
- sold_out_closeout_without_zero_inventory

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- inventory reserve write: false
- inventory decrement write: false
- sold-out closeout write: false
- fulfillment record write: false
- allocation claim creation: false
- wallet signing: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

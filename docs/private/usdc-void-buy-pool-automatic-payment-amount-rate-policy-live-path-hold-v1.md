# USDC/VOID Automatic Payment Amount Rate Policy Live-Path Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1

This is a private hold packet for the future automatic payment amount/rate policy live path.

It does not enable automatic payment execution. It does not enable fulfillment. It defines the deterministic money math gates required before activation.

Linked prerequisite packets:

- Verified receipt parser live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1
- Duplicate payment guard live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1
- Fulfillment wallet policy hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1
- Receiver allowlist confirmation hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1
- Dual-chain USDC acceptance allowlist: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1

Fixed buy-pool policy:

- asset: USDC
- USDC decimals: 6
- VOID price: 0.50 USDC per 1 VOID
- derived rate: 1 USDC buys 2 VOID
- accepted chains: Ethereum mainnet USDC and Base mainnet native USDC only

Required amount/rate gates:

- receipt value_raw must be parsed as uint256
- USDC decimals must equal 6
- quote/payment-intent key must be present
- receipt chain/token/receiver must already be verified
- payment amount must match quote policy
- underpayment must reject
- overpayment must reject unless an explicit operator overpayment policy exists
- zero amount must reject
- negative or malformed amount must reject
- allocation amount must be derived deterministically
- duplicate guard key must remain bound to the same amount/rate result

Rejected amount/rate states:

- zero_amount
- malformed_amount
- wrong_decimals
- missing_quote_key
- missing_rate_policy
- underpayment
- overpayment_without_policy
- quote_amount_mismatch
- chain_token_receiver_not_verified
- duplicate_key_amount_mismatch
- allocation_amount_not_deterministic

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- amount/rate live execution: false
- duplicate ledger write: false
- fulfillment record write: false
- allocation claim creation: false
- wallet signing: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

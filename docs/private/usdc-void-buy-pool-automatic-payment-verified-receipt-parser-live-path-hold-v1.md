# USDC/VOID Automatic Payment Verified Receipt Parser Live-Path Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1

This is a private hold packet for the future automatic payment verified receipt parser live path.

It does not enable automatic payment execution. It does not enable fulfillment. It defines the parser gates required before activation.

Linked prerequisite packets:

- Duplicate payment guard live-path hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1
- Fulfillment wallet policy hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1
- Receiver allowlist confirmation hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1
- Dual-chain USDC acceptance allowlist: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1

Required receipt parser gates:

- receipt status must be successful
- chain_id must be allowlisted
- emitting token contract must match allowlisted USDC contract
- ERC-20 Transfer topic must match 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
- from address must parse
- to receiver must match private receiver allowlist
- value_raw must parse as uint256
- decimals must be 6
- log_index must be present
- tx_hash must be present
- duplicate guard key must be derivable

Accepted chain/token scope:

1. Ethereum mainnet USDC
   - chain_id: 1
   - token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   - decimals: 6

2. Base mainnet native USDC
   - chain_id: 8453
   - token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   - decimals: 6

Rejected parser states:

- failed receipt
- missing receipt
- missing logs
- wrong Transfer topic
- wrong token contract
- wrong chain_id
- wrong receiver
- wrong decimals
- malformed value
- missing tx_hash
- missing log_index
- duplicate key derivation failure
- bridged USDbC

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- parser live execution: false
- duplicate ledger write: false
- fulfillment record write: false
- wallet signing: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

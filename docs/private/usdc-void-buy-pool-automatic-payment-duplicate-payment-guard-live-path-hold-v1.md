# USDC/VOID Automatic Payment Duplicate Payment Guard Live-Path Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1

This is a private hold packet for the future automatic payment duplicate-payment guard live path.

It does not enable automatic payment execution. It does not enable fulfillment. It defines the required duplicate-detection keys before activation.

Linked prerequisite packets:

- Fulfillment wallet policy hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1
- Receiver allowlist confirmation hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1
- Operator activation packet hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1
- Dual-chain USDC acceptance allowlist: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1

Duplicate guard keys required before activation:

- chain_id
- token_contract
- tx_hash
- log_index
- from_address
- to_receiver
- value_raw
- buyer_identity_binding_key
- payment_intent_or_quote_key

Required duplicate states:

- unseen_payment_candidate
- seen_same_tx_log_rejected
- seen_same_tx_different_buyer_rejected
- seen_same_buyer_same_payment_rejected
- seen_same_payment_after_fulfillment_rejected
- malformed_or_missing_key_rejected

Required before activation:

- deterministic duplicate key derivation proof
- append-only duplicate ledger read proof
- duplicate ledger write guard proof
- fulfilled payment terminal-state guard proof
- buyer identity mismatch duplicate proof
- chain/token/receiver duplicate scope proof
- rollback/disable switch proof
- cross-box duplicate guard dry-run
- final Precision sync

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- duplicate ledger write: false
- fulfillment record write: false
- wallet signing: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

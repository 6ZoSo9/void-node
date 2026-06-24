# USDC/VOID Automatic Payment Receiver Allowlist Confirmation Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1

This is a private hold packet for the future automatic payment receiver allowlist.

It does not publish receiver addresses. It does not enable automatic payment execution. It does not enable fulfillment.

Linked prerequisite packets:

- Operator activation packet hold: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1
- Dual-chain USDC acceptance allowlist: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1

Required private receiver slots:

1. Ethereum mainnet USDC receiver
   - chain_id: 1
   - token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   - decimals: 6
   - receiver value: private / withheld / required before activation

2. Base mainnet native USDC receiver
   - chain_id: 8453
   - token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   - decimals: 6
   - receiver value: private / withheld / required before activation

Rejected:

- public receiver publication
- missing receiver
- wrong chain receiver
- wrong token receiver
- shared ambiguous receiver without explicit operator confirmation
- bridged USDbC receiver
- testnet receiver

Authority state:

- automatic payment execution: false
- automatic fulfillment: false
- wallet signing: false
- treasury movement: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

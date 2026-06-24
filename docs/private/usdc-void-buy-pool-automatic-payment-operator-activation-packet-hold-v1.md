# USDC/VOID Automatic Payment Operator Activation Packet Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1

This is a private operator packet shape for future automatic verified-payment handling.

It does not enable automatic payments. It does not enable fulfillment. It is a hold packet that defines the required gates before activation.

Public prerequisites already sealed or linked:

- Dual-chain USDC allowlist: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1
- Automatic payment enablement preflight closeout: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1

Accepted payment assets for future activation:

1. Ethereum mainnet native USDC
   - chain_id: 1
   - token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   - decimals: 6

2. Base mainnet native USDC
   - chain_id: 8453
   - token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   - decimals: 6

Rejected:

- bridged USDbC
- wrong chain
- wrong token contract
- wrong receiver
- wrong decimals
- duplicate payment
- insufficient confirmations
- malformed receipt
- unknown buyer identity binding

Required before activation:

- explicit operator approval record
- private receiver allowlist confirmation
- private fulfillment wallet policy
- duplicate payment guard live-path proof
- verified receipt parser live-path proof
- chain/token/receiver allowlist live-path proof
- inventory reserve/decrement proof
- sold-out closeout proof
- rollback/disable switch proof
- cross-box live dry-run
- final Precision sync

Authority state in this packet:

- automatic payment execution: false
- automatic fulfillment: false
- wallet signing: false
- treasury movement: false
- VOID transfer: false
- public mutation: false

This packet is private. No public route is allowed.

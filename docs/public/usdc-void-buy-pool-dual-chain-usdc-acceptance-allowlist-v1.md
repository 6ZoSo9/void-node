# USDC/VOID Dual-Chain USDC Acceptance Allowlist v1

Marker: VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1

This public read-only policy locks the USDC/VOID buy-pool payment acceptance surface to two native USDC contracts only:

1. Ethereum mainnet USDC
   - chain_id: `1`
   - token: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
   - decimals: `6`

2. Base mainnet native USDC
   - chain_id: `8453`
   - token: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - decimals: `6`

Routes:

- HTML: `/public-node/usdc-void-buy-pool/automatic-payment-enablement/dual-chain-usdc-allowlist-v1`
- JSON: `/public-node/usdc-void-buy-pool/automatic-payment-enablement/dual-chain-usdc-allowlist-v1.json`

Rejected by policy:

- bridged USDbC
- alternate USDC-like contracts
- non-USDC stablecoins
- testnets
- non-allowlisted chains
- wrong receiver
- wrong token decimals
- malformed or ambiguous chain/token identifiers

Boundary:

- public read-only policy only
- no automatic payment execution
- no automatic fulfillment
- no buyer fulfillment
- no manual fulfillment record write/apply
- no allocation claim creation
- no VOID transfer
- no wallet signing
- no treasury movement
- no public mutation

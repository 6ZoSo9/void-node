# USDC/VOID Buy Pool Chain + Token + Receiver Allowlist Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1

Purpose: prove the public allowlist policy needed before automatic USDC receipt verification can safely trust a payment candidate.

This gate is green for allowlist policy only.

Allowed chains:

- Ethereum mainnet: chain_id 1
- Base mainnet: chain_id 8453

Allowed token:

- USDC only
- Ethereum USDC: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
- Base USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
- Decimals: 6

Allowed receiver:

- 0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5

Deprecated / blocked historical receiver:

- 0x45dd104e3f7cc2a080f2eda094d011d09c51960b

Gate result:

- chain_token_receiver_allowlist_gate_green: true
- chain_allowlist_green: true
- token_allowlist_green: true
- receiver_allowlist_green: true

Non-authority statement:

This gate does not verify a real payment now, does not fetch live chain data now, does not approve a buyer, does not write a private allocation ledger, does not reserve inventory, does not enable automatic fulfillment, and does not transfer VOID.

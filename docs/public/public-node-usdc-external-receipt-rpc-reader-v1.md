# USDC External Receipt RPC Reader v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1

Purpose: introduce a read-only live EVM JSON-RPC receipt reader for USDC external payment observation before finality verification, state-root trust, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

This is the first live external-chain observation boundary.

Default mode is disabled unless explicit environment variables are supplied:

- USDC_EXTERNAL_RPC_URL
- USDC_EXTERNAL_TX_HASH

Optional semantic filters:

- USDC_EXTERNAL_CHAIN_ID
- USDC_EXTERNAL_USDC_TOKEN
- USDC_EXTERNAL_OFFICIAL_RECEIVER
- USDC_EXTERNAL_AMOUNT_RAW

The reader may fetch eth_getTransactionReceipt and normalize ERC-20 Transfer logs.
The reader does not verify finality.
The reader does not trust an external state root.
The reader does not verify a payment as final.
The reader does not reserve inventory.
The reader does not write the private allocation ledger.
The reader does not fulfill automatically.
The reader does not transfer VOID.

Reader path: ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py

Public route target: /public-node/usdc-void-buy-pool/external-receipt-rpc-reader-v1.json

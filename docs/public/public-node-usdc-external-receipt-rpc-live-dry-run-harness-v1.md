# USDC External Receipt RPC Live Dry-Run Harness v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1

Purpose: add an operator-run dry-run harness around the USDC External Receipt RPC Reader v1.

The harness may invoke the receipt reader in live read-only mode only when explicit environment variables are supplied:

- USDC_EXTERNAL_RPC_URL
- USDC_EXTERNAL_TX_HASH

Optional semantic filters remain:

- USDC_EXTERNAL_CHAIN_ID
- USDC_EXTERNAL_USDC_TOKEN
- USDC_EXTERNAL_OFFICIAL_RECEIVER
- USDC_EXTERNAL_AMOUNT_RAW

Default proof mode is no-env and must remain disabled/no-authority.

Even when explicit live env is supplied, the harness must prove observation-only output:

- no finality verification
- no external state-root trust
- no real payment verification
- no private allocation ledger write
- no inventory reserve
- no automatic fulfillment
- no VOID transfer

Harness path: ops/mainnet0/usdc-external-receipt-rpc-live-dry-run-harness-v1.sh

Reader dependency: ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py

Public route target: /public-node/usdc-void-buy-pool/external-receipt-rpc-live-dry-run-harness-v1.json

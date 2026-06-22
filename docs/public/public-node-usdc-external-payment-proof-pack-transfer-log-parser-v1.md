# USDC External Payment Proof Pack Transfer Log Parser v1

Marker: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_TRANSFER_LOG_PARSER_V1

Purpose: define an offline ERC-20 Transfer log parser boundary for USDC external payment proof packs before live RPC fetch, finality verification, real payment verification, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

This parser validates payment semantics from a proof-pack-shaped fixture:

- ERC-20 Transfer topic0
- token contract field consistency
- sender field presence
- receiver matches official receiver field
- amount_raw matches transfer log amount
- canonical payment identity remains stable
- all authority flags remain false

Example fixture: fixtures/public/usdc-external-payment-proof-pack-transfer-log-parser-example-v1.json
Parser path: ops/mainnet0/usdc-external-payment-proof-pack-transfer-log-parser-v1.py
Public route: /public-node/usdc-void-buy-pool/external-payment-proof-pack-transfer-log-parser-v1.json

Non-activation statement: this parser is offline fixture validation only. It does not fetch chain data, verify a real payment, verify finality, trust an external root, write a ledger, reserve inventory, fulfill automatically, or transfer VOID.

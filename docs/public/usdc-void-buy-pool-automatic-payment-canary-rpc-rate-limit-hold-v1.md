# USDC/VOID Buy Pool Automatic Payment Canary RPC Rate Limit Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_RATE_LIMIT_HOLD_V1`

## Purpose

Define the public-safe hold behavior when automatic payment canary receipt verification is blocked by RPC rate limits, RPC timeouts, null receipts, or RPC errors.

RPC failure is a pause, not a rejection.

## Runtime routes

- `/public-node/usdc-void-buy-pool/automatic-payment-canary/rpc-rate-limit-hold-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-canary/rpc-rate-limit-hold-v1.json`

## Classification policy

- `200_valid_receipt_transfer_log` -> eligible candidate path
- `200_null_receipt` -> pending not mined or not indexed
- `403` -> held RPC access blocked
- `429` -> held RPC rate limited
- `timeout` -> held RPC timeout
- `rpc_error` -> held RPC error
- `wrong_chain` -> rejected wrong chain
- `wrong_token` -> rejected wrong token
- `wrong_receiver` -> rejected wrong receiver
- `duplicate_payment_identity` -> rejected duplicate

## Boundary

Held RPC states do not create candidates, allocation records, private ledger writes, inventory reserves, fulfillment records, wallet signatures, or VOID transfers.

Held RPC states do not require buyer action unless the operator later determines the transaction hash or buyer packet was invalid.

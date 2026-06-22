# USDC → VOID Presale Verified Payment Detection Gate v1

Marker: `VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1`

## Purpose

Define the verified USDC payment detection contract for the USDC → VOID presale automatic-fulfillment path.

This gate does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Detection contract

A payment may only be treated as verified when all required checks pass:

1. request id exists in the presale request set.
2. submitted tx hash is a valid EVM transaction hash.
3. source chain is allowlisted.
4. source chain RPC is configured.
5. transaction receipt exists.
6. transaction receipt status is successful.
7. receipt contains a matching USDC ERC-20 Transfer log.
8. token contract matches the allowlisted USDC contract for that chain.
9. receiver matches the configured official receive address.
10. amount satisfies the quoted USDC amount.
11. duplicate-payment guard remains required before fulfillment activation.
12. inventory guard remains required before allocation reservation.
13. explicit operator activation record remains required before automatic fulfillment.

## Supported chains

- Base USDC
- Ethereum mainnet USDC

## Inventory effect

- `quote_created`: no inventory effect.
- `payment_pending`: no inventory effect.
- `payment_submitted_unverified`: no inventory effect.
- `submitted_tx_hash`: no inventory effect.
- `payment_verified`: allocation may reserve, but only after duplicate and inventory guards are green.

## Current authority

- `verified_usdc_payment_detection_gate_defined`: true
- `verified_usdc_payment_detection_gate_green`: false
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Public route

- `/public-node/usdc-void-buy-pool/verified-payment-detection-gate-v1.json`

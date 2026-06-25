# USDC/VOID Buy Pool Automatic Payment Canary Runtime Config v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RUNTIME_CONFIG_V1`

## Purpose

Expose a public-safe runtime status/config surface for the private automatic payment canary.

The private canary is enabled, but only as a capped operator-controlled canary.

## Runtime routes

- `/public-node/usdc-void-buy-pool/automatic-payment-canary/runtime-config-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-canary/runtime-config-v1.json`

## Boundary

This route may disclose safe canary status, limits, and authority boundaries.

It must not disclose private fixture paths, private ledger paths, signer material, wallet material, treasury secrets, or private operator execution material.

## Authority

Automatic payment canary status: enabled.

Canary limit: one candidate.

Public mutation authority: false.
Public buyer execution authority: false.
Wallet signing authority: false.
VOID transfer authority: false.

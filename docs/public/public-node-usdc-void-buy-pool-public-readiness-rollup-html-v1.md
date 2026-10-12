# USDC → VOID Buy Pool Public Readiness Rollup HTML v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1`

## Purpose

Add a human-facing public readiness rollup page for the USDC → VOID buy-pool.

## Public route

- `/public-node/usdc-void-buy-pool/readiness-rollup-v1`

## Linked public routes

- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`
- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/buy-pool/usdc-void-v1.json`
- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1`
- `/public-node/route-index.json`

## Boundary

This route is public read-only.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, mutate ledger state, or perform VOID delivery.

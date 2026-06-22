# USDC → VOID Buy Pool Public Reviewer Verify Pack v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1`

## Purpose

Add a public read-only reviewer verify pack for the USDC → VOID buy-pool readiness bundle.

## Public route

- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json`

## Verifies

- `/public-node`
- `/public-node/route-index.json`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`
- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/buy-pool/usdc-void-v1.json`
- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1`

## Boundary

This route is public read-only.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, mutate ledger state, or perform VOID delivery.

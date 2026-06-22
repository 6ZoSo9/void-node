# USDC → VOID Buy Pool Public Reviewer Verify Pack HTML v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1`

## Purpose

Add a human-readable reviewer verify pack page for the USDC → VOID buy-pool readiness bundle.

## Public route

- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1`

## Related public JSON route

- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json`

## Updated public discovery surfaces

- `/public-node`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1`
- `/public-node/route-index.json`

## Boundary

This patch adds a public read-only HTML wrapper around an already-sealed public JSON verify pack.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, mutate ledger state, or perform VOID delivery.

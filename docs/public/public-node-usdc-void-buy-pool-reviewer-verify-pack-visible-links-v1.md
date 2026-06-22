# USDC → VOID Buy Pool Reviewer Verify Pack Visible Links v1

Marker: `VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1`

## Purpose

Add visible links to the sealed public reviewer verify pack from the human-facing buy-pool readiness surfaces.

## Updated public surfaces

- `/public-node`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1`

## Linked public route

- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json`

## Boundary

This patch only adds public read-only links to an already-sealed public reviewer verification packet.

It does not add a route, create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, mutate ledger state, or perform VOID delivery.

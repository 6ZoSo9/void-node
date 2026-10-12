# USDC → VOID Buy Pool Readiness Rollup Route Index Discovery v1

Marker: `VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1`

## Purpose

Expose the USDC → VOID buy-pool public readiness surfaces through `/public-node/route-index.json`.

## Route-index entries

- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/buy-pool/usdc-void-v1.json`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`
- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1`

## Boundary

This patch only updates public route-index discovery metadata.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, or mutate ledger state.

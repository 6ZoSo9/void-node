# USDC → VOID Buy Pool Execution Hold Status Route Index Runtime Kind Tighten v1

Marker: `VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1`

## Purpose

Tighten route-index metadata now that the execution-hold status pages are real read-only runtime HTML pages.

## Runtime pages

- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1`
- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1`

## Boundary

This patch only updates public route-index classification.

It does not:

- create a fulfillment endpoint,
- expose private operator packet material,
- expose private buyer records,
- trigger VOID transfer,
- create automatic delivery,
- create public wallet-send authority,
- or grant autonomous write authority.

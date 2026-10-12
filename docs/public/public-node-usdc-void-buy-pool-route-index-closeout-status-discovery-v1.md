# USDC → VOID Buy Pool Route Index Closeout Status Discovery v1

Marker: `VOID_USDC_VOID_BUY_POOL_ROUTE_INDEX_CLOSEOUT_STATUS_DISCOVERY_V1`

## Purpose

Make the public route index explicitly identify the USDC → VOID buy-pool closeout status route as a reviewer-discoverable read-only surface.

## Discovery chain

- `/public-node`
- `/public-node/usdc-void-buy-pool/closeout-status-v1.json`
- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1`
- `/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json`
- `/public-node/usdc-void-buy-pool/readiness-rollup-v1`

## Boundary

This lane is discovery-only.

It does not add wallet fulfillment, automatic fulfillment, manual fulfillment records, private execution packet exposure, buyer execution authority, ledger writes, VOID transfers, or public mutation authority.

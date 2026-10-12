# USDC → VOID Buy Pool Operator Execution Hold Status Route Index Entry v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1`

## Purpose

This public-safe entry documents that the USDC → VOID buy-pool operator execution hold status is discoverable through the public evidence map without exposing private operator execution material.

## Discovery target

- Status document: `docs/public/public-node-usdc-void-buy-pool-operator-execution-hold-status-v1.md`
- Status marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1`
- Public buy-pool page: `/public-node/buy-pool/usdc-void-v1`
- Public buy-pool JSON: `/public-node/buy-pool/usdc-void-v1.json`
- Public funding page: `/public-node/funding`

## Boundary

This entry is discovery-only.

It does not:

- create a public execution endpoint,
- expose private operator packets,
- expose private receipt records,
- expose buyer payment material,
- expose wallet keys,
- trigger fulfillment,
- open automatic delivery,
- or grant autonomous write authority.

## Public interpretation

Reviewers should read this entry as an evidence-map pointer proving the buy-pool is public-readable while operator execution remains gated and withheld.

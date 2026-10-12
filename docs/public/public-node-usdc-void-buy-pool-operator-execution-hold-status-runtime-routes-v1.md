# USDC → VOID Buy Pool Operator Execution Hold Status Runtime Routes v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1`

## Purpose

Expose the already-sealed public-safe buy-pool operator execution hold status documents through read-only public runtime routes.

## Runtime routes

- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1`
- `/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1`

## Boundary

These routes are read-only evidence pages.

They do not:

- create execution packets,
- expose private operator packets,
- expose buyer payment records,
- expose wallet keys,
- trigger VOID fulfillment,
- open public fulfillment,
- open public wallet-send mutation,
- or grant autonomous write authority.

## Public interpretation

The buy-pool is public-readable. Operator execution remains gated, withheld, manual, and non-public.

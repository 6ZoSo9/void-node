# USDC → VOID Buy Pool Public Readiness Rollup Runtime Mount Repair v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1`

## Purpose

Repair the public readiness rollup runtime mount after cross-box live checks showed the source proof green but the live route returning 404.

## Route

- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`

## Repair strategy

Mount the readiness rollup route adjacent to the already-live operator execution hold status route.

## Boundary

This repair is read-only.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, or mutate ledger state.

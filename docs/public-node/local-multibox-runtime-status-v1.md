# VOID Local Multi-Box Runtime Status v1

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1`

This document separates **active fleet topology** from **dated runtime observation**.

## Active operator fleet

As of 2026-09-30, the active operator fleet topology is:

- Precision / `zoso-Precision-Tower-7810`
- Nimo/N153B
- Xiphos

Alienware is retired and is not part of the active operator fleet.

This static document does **not** claim that all three active machines are currently
runtime-green. Current health, readiness, synchronization, and peer state require fresh
live evidence.

## Historical runtime observation

The original v1 observation was captured at `2026-07-03T22:49:34Z` during the
Precision recovery checkpoint. That dated observation covered:

- Precision
- Alienware
- Nimo/N153B

At that checkpoint, Precision was recorded at repository head
`57015d528408b0b73db47c7e4c608e5fee3c0a6b`, HTTP `4100`, P2P `4700`,
readiness green, observed chain head `1856587`, and gap `0`.

Those values are historical evidence, not present-tense runtime claims.

## Discovery routes

Use relative public-safe routes rather than frozen host/IP addresses:

- `/public-node/runtime`
- `/public-node/runtime/index.json`
- `/public-node/runtime/local-multibox-status-v1.json`
- `/public-node/runtime/local-multibox-status-v1.html`
- `/__void/diag/local-multibox-runtime-route-v1.json`

## Boundary

This status is public-safe runtime visibility only.

It does not enable or claim:

- wallet execution
- money movement
- buy-VOID fulfillment
- WC-to-VOID swap execution
- validator admission
- validator mutation
- public mutation routes
- public self-serve WC earning
- public internet mesh completion
- current all-fleet runtime-green state

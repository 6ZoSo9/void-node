# USDC → VOID Buy Pool Public Readiness Rollup v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1`

## Purpose

Expose one public read-only rollup for the USDC → VOID buy-pool public readiness boundary.

## Public route

- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`

## Rollup scope

The rollup links and summarizes:

- funding page readiness,
- public buy-pool HTML route,
- public buy-pool JSON route,
- buyer-facing HTML safety card,
- machine-readable buyer-status JSON fields,
- operator execution hold status,
- route-index discovery entries,
- private/manual execution packet boundary,
- public mutation boundary.

## Safety

This is a read-only JSON status route.

It does not create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, or mutate ledger state.

# Public Surface Safety Index Readiness Rollup Route Accounting Repair v1

Marker: `VOID_PUBLIC_SURFACE_SAFETY_INDEX_READINESS_ROLLUP_ROUTE_ACCOUNTING_REPAIR_V1`

## Purpose

Repair the public surface safety index after the USDC → VOID buy-pool readiness rollup runtime mount repair.

## Problem

The readiness rollup route became live through the runtime mount repair, but the source still contained an earlier non-live duplicate registration for the same public path.

The safety index also needed to account for the one new read-only public route.

## Route

- `/public-node/usdc-void-buy-pool/readiness-rollup-v1.json`

## Repair

- remove the earlier non-live duplicate route registration,
- keep the runtime-mounted read-only route,
- keep duplicate public route count at zero,
- update the public surface safety index literal GET count to match the current audited route registry.

## Boundary

This repair does not add public mutation, payment intake, fulfillment, wallet-send authority, ledger writes, or autonomous write authority.

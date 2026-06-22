# USDC → VOID Buy Pool Public Reviewer Verify Pack HTML Visible Marker Runtime Repair v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1`

## Purpose

Repair the public readiness rollup HTML runtime marker attached to the reviewer verify pack HTML link.

## Repair

The readiness rollup HTML route must expose the current reviewer verify pack HTML visible-links marker:

- `VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1`

The stale predecessor marker must not remain in runtime source:

- `VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1`

## Boundary

This is a marker-only public HTML repair.

It does not add mutation authority, wallet fulfillment, automatic fulfillment, private execution data, ledger writes, or buyer execution authority.

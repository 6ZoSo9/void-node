# USDC → VOID Buy Pool Public Reviewer Verify Pack HTML Runtime Marker Attribute Repair v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_RUNTIME_MARKER_ATTRIBUTE_REPAIR_V1`

## Purpose

Make the human reviewer verify pack page link marker runtime-visible on both human-facing HTML discovery surfaces.

## Reason

The human reviewer verify pack HTML page and links were live, but the readiness rollup page exposed the link without the marker appearing in the rendered runtime HTML.

## Repair

Represent the marker as a `data-void-marker` attribute on the reviewer verify pack page link list item instead of relying on an HTML comment.

## Boundary

This is a visibility-only repair.

It does not add a route, create a quote, accept payment, expose buyer records, expose private operator packets, open a fulfillment endpoint, grant wallet-send authority, grant autonomous write authority, mutate ledger state, or perform VOID delivery.

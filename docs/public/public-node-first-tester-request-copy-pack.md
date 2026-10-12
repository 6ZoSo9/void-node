# VOID Public Node First Tester Request Copy Pack <!-- VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_DOC_V1 -->

Public JSON copy pack for recruiting the first outside testers for a VOID public node.

## Route

    /public-node/first-tester-request-copy-pack.json

## Purpose

This route gives the operator ready-to-post copy for:

- Reddit
- X/Twitter
- short DM
- GitHub README / issue blurb

It points testers to the human tester share page and the machine-readable tester lane summary.

## Tester share page

    /public-node/tester-share

## Tester lane summary

    /public-node/tester-lane-summary.json

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Expected receipt file

    tester-receipt.json

## Safety boundary

This route is public-read-only.

It does not expose a public POST endpoint, call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.


## GitHub pointer <!-- VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_README_POINTER_DOC_V1 -->

The top-level README points operators to:

    /public-node/first-tester-request-copy-pack.json

This route provides ready-to-post first-tester copy for Reddit, X/Twitter, short DMs, and GitHub blurbs.
## Real data status link <!-- VOID_PUBLIC_NODE_FIRST_TESTER_REAL_DATA_STATUS_DOC_V1 -->

The first tester request copy pack includes the real-data lane status URL:

    /public-node/real-data-import-lane-status.json

Expected marker:

    VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1

Tester copy should mention that the smoke now verifies the Demo 003 folder/site path and lets testers inspect the operator-local real-data lane status.
## Real data rollup line <!-- VOID_PUBLIC_NODE_FIRST_TESTER_REAL_DATA_ROLLUP_LINE_DOC_V1 -->

The first tester request copy pack exposes the expected live rollup guard:

    real_data_tester_lane_summary_link_green=true

This makes the tester request copy point to both the public smoke marker and the live rollup line proving the real-data tester-lane link is present.

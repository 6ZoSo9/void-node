# VOID Public Node Tester Share Page <!-- VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_DOC_V1 -->

Human share page for outside testers checking a VOID public node.

## Route

    /public-node/tester-share

## Purpose

This page gives a tester:

- the exact curl/bash command
- the expected green marker
- receipt instructions
- useful public route links
- safety boundaries

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Receipt file

    tester-receipt.json

## Safety boundary

This page is public-read-only HTML.

It does not expose a public POST endpoint, call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.

## Real data lane status <!-- VOID_PUBLIC_NODE_TESTER_SHARE_REAL_DATA_STATUS_DOC_V1 -->

The human tester-share page links to:

    /public-node/real-data-import-lane-status.json

This lets a tester inspect the operator-local real-data import lane status from the browser before or after running the smoke.

Safety boundary: public read-only, operator-local import only, no public upload, and not trusted as network truth.

Expected route marker:

    VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1

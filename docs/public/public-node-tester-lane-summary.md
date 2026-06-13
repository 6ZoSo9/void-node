# VOID Public Node Tester Lane Summary <!-- VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_DOC_V1 -->

Public JSON route summarizing the outside tester lane for a VOID public node.

## Route

    /public-node/tester-lane-summary.json

## Purpose

This route gives testers, future agents, wallets, and UIs one machine-readable object showing that the public tester lane is assembled.

It summarizes:

- tester share page
- standalone smoke script
- external tester copy pack
- result receipt schema
- result intake route
- local operator import helper
- agent discovery
- route manifest
- self-check snapshot
- proofs

## Expected status

    public_node_outside_tester_lane_ready

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Expected receipt marker

    VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1

## Safety boundary

This route is public-read-only.

It does not expose a public POST endpoint, call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.


## GitHub pointer <!-- VOID_PUBLIC_NODE_TESTER_LANE_README_POINTER_DOC_V1 -->

The top-level README points outside testers to:

    /public-node/tester-share
    /public-node/tester-lane-summary.json
## Real data status link <!-- VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_REAL_DATA_STATUS_DOC_V1 -->

The tester lane summary exposes:

    /public-node/real-data-import-lane-status.json

Expected marker:

    VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1

This keeps the machine-readable lane summary aligned with the human tester-share page and outside tester smoke.

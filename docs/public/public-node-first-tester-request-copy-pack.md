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

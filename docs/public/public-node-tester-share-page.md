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

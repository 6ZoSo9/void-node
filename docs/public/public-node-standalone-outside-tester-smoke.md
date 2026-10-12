# VOID Public Node Standalone Outside Tester Smoke Script <!-- VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_DOC_V1 -->

Public read-only shell script route for outside testers who do not have a checked-out VOID repo.

## Route

    /public-node/standalone-outside-tester-smoke.sh

## Purpose

This route serves a standalone smoke script that checks only public routes and emits a tester receipt.

It lets a stranger test a VOID public node with curl and bash.

## Example usage

    curl -fsSL <PUBLIC_NODE_BASE>/public-node/standalone-outside-tester-smoke.sh -o /tmp/void-public-node-smoke.sh
    PUBLIC_NODE_BASE=<PUBLIC_NODE_BASE> bash /tmp/void-public-node-smoke.sh

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Script marker

    VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1

## Safety boundary

This route is public-read-only.

The script checks public routes only. It does not call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.

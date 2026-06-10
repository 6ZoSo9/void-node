# VOID Public Node Outside Tester Smoke Surface <!-- VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_DOC_V1 -->

Live public route exposing the outside tester smoke command.

## Route

    /public-node/outside-tester-smoke.json

## Purpose

This lets a tester discover the smoke command from the public node itself.

## Expected command shape

    PUBLIC_NODE_BASE=<public-node-base-url> ops/mainnet0/public-node-outside-tester-smoke.sh

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Safety boundary

This route is public-route and read-only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

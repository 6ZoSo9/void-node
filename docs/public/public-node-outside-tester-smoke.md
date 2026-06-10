# VOID Public Node Outside Tester Smoke <!-- VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_DOC_V1 -->

One-command smoke script for outside testers.

## Script

    ops/mainnet0/public-node-outside-tester-smoke.sh

## Usage

    PUBLIC_NODE_BASE=https://your-node.example ops/mainnet0/public-node-outside-tester-smoke.sh

## What it checks

The script fetches the public node page, share link, tester bundle, tester loop status, result receipt, quickstart, tester handoff, public exposure smoke pack, route index, and public proofs.

## Expected success

The script prints `ok` for every route and ends with:

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Safety boundary

This script checks public routes only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

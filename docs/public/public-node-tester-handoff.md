# VOID Public Node Tester Handoff <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_DOC_V1 -->

Send this to someone testing a VOID public node.

## Open first

    /public-node

## Machine-readable handoff

    /public-node/tester-handoff.json

## Quickstart

    /public-node/quickstart.json

## Smoke command

Replace the base URL with the node URL you were given.

    PUBLIC_NODE_BASE=https://your-domain.example
    for p in /public-node /public-node/quickstart.json /public-node/tester-handoff.json /public-node/route-index.json /public-node/external-base-url.json /public-node/public-exposure-smoke-pack.json /proofs; do
      curl -fsS "$PUBLIC_NODE_BASE$p" >/dev/null && echo "ok $p"
    done

## Expected success

The command should print `ok` for every public route.

## What this does not test

This does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

## Report back

    node_url=
    smoke_result=
    browser_result=
    notes=

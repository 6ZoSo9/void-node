# VOID Public Node Tester Loop Status <!-- VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_DOC_V1 -->

Machine-readable status for the outside tester loop.

## Route

    /public-node/tester-loop-status.json

## Discovery chain

    README.md
    /public-node/share-link.json
    /public-node
    /public-node/tester-bundle.json
    /public-node/tester-result-receipt.json

## Meaning

`loop_ready=true` means the public tester path is wired from GitHub discovery to the result receipt.

## Safety boundary

This route is public-route and read-only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

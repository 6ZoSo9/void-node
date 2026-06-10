# VOID Public Node Share Link <!-- VOID_PUBLIC_NODE_SHARE_LINK_DOC_V1 -->

Copy-paste tester invite for a VOID public node.

## Route

    /public-node/share-link.json

## What it gives testers

- the public node URL
- the tester bundle URL
- the result receipt URL
- a short invite
- a longer copy-paste invite

## Tester flow

    open /public-node
    open /public-node/tester-bundle.json
    run the smoke command
    paste back /public-node/tester-result-receipt.json fields

## Safety boundary

This route is public-route and read-only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

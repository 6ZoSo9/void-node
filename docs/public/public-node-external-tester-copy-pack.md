# VOID Public Node External Tester Copy Pack <!-- VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_DOC_V1 -->

Live public JSON route giving outside testers one copy/paste pack for checking a VOID public node.

## Route

    /public-node/external-tester-copy-pack.json

## Purpose

This route gives a stranger, tester, script, future wallet, or agent one object containing:

- public node URL
- well-known discovery URL
- route manifest URL
- self-check snapshot URL
- outside tester smoke route
- tester bundle URL
- tester result receipt URL
- public proofs URL
- smoke command
- expected green marker

## Expected status

    external_tester_copy_pack_ready

## Expected green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Safety boundary

This route is public-route and read-only.

It does not call private APIs, mutate state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, or mutate validators.

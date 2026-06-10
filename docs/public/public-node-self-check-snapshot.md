# VOID Public Node Self-Check Snapshot <!-- VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_DOC_V1 -->

Live public JSON route for checking whether a VOID public node is externally testable and read-only.

## Route

    /public-node/self-check-snapshot.json

## Purpose

This route gives testers, UIs, and future agents one simple object that says:

- which public routes are expected
- which helper links exist
- whether the public node is externally testable
- whether the surface remains read-only

## Expected status

    public_node_externally_testable_read_only_surface_ready

## Safety boundary

This route is public-route and read-only.

It does not call private APIs, mutate state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, or mutate validators.

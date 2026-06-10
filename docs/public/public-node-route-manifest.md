# VOID Public Node Route Manifest <!-- VOID_PUBLIC_NODE_ROUTE_MANIFEST_DOC_V1 -->

Live public JSON route exposing the canonical public-node route map.

## Route

    /public-node/route-manifest.json

## Purpose

This route gives testers, UIs, and future agents one machine-readable manifest containing:

- public route paths
- route markers
- route purposes
- safety class per route

## Expected status

    public_node_route_manifest_ready

## Safety boundary

Every route in this manifest is public-read-only.

The manifest does not call private APIs, mutate state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, or mutate validators.

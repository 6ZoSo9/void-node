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

## Data Weight Record route pointer

Marker: `VOID_PUBLIC_NODE_ROUTE_MANIFEST_DATA_WEIGHT_RECORD_POINTER_V1`

The route manifest includes `/public-node/data-weight-record.json` so agents, testers, and public-node UIs can discover the next layer after local data storage.

Local Data Drop exposes operator-local files through public read-only routes.

Data Weight Record v1 explains how VOID begins weighting those stored objects by verification, freshness, duplicate status, suspicion state, tombstone state, storage tier, AI visibility, trust score, and promotion eligibility.

Policy boundary: persistent does not mean equal priority.

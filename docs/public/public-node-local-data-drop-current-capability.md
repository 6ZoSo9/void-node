# Public Node Local Data Drop Current Capability v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1`

This public node can now demonstrate real local data storage and serving behavior.

## What works now

The operator can:

1. detect the live public route DATA_DIR,
2. generate a no-mutation import target plan,
3. import local files into the live route DATA_DIR,
4. expose imported files as weighted records,
5. serve an imported object by object id,
6. serve the same bytes by sha256 content address,
7. serve proof JSON for the imported object,
8. verify object route, content-address route, and proof route with one reusable verifier.

## Current proven demo object

- object id: `live-import-demo-002.txt`
- sha256: `264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871`
- live route DATA_DIR: `/home/zoso/dev/void-node/data_a`
- weighted route object count after Demo 002: `3`

## Standard verifier

    bash ops/mainnet0/public-node-local-data-drop-object-endpoints-proof.sh live-import-demo-002.txt 264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

Expected marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1_GREEN

## Boundary

This is still operator-local import, not open public upload. Public routes are read-only.

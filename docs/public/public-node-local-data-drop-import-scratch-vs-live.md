# Public Node Local Data Drop Import: Scratch vs Live v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1`

## Rule

Use scratch import for proofs and tests.

Use live import only when intentionally changing what the Public Node serves.

## Scratch import

Scratch import sets `DATA_DIR` to a temporary or alternate data directory.

That proves the import helper works without changing the live Public Node object count.

Current proven scratch lanes:

- single-file scratch import
- multi-file scratch import
- nested path sanitization to object id `subdir__gamma.txt`

## Live import

Live import uses the node runtime data directory.

That changes the live `/public-node/local-data-drop/weighted.json` object count and may require updating proofs that currently expect `object_count=1`.

## Current live state

The current Precision live demo intentionally remains:

- live weighted object count `1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

Current mode remains:

- Precision-only green
- Alienware deferred
- cross-box pending

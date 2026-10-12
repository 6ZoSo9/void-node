# Public Node Local Data Drop Live Import Preflight Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_CLOSEOUT_V1`

## What closed

The Public Node now has a no-mutation live import preflight tool.

The preflight checks a source directory, reads the live weighted route, predicts the expected object count after import, and prints the exact live import command shape.

It does not run the import.

## Tool

- `ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1`

## Proof

- `ops/mainnet0/public-node-local-data-drop-live-import-preflight-proof.sh`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_GREEN`

## Checkpoint

- commit `488cea5e`
- tag `ckpt-public-node-local-data-drop-live-import-preflight-green-20260612-150133`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_COMMITTED`

## Current proven behavior

The proof confirmed:

- source file counting works
- nested source files are listed
- current live `object_count=1`
- expected post-import count is calculated
- recommended live import command is printed
- `mutation_performed=false`
- live weighted route remains unchanged

## Current live state

The live Public Node weighted route remains intentionally unchanged:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

Current mode remains:

- Precision-only green
- Alienware deferred
- cross-box pending

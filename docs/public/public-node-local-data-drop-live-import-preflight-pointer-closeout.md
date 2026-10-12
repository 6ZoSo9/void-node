# Public Node Local Data Drop Live Import Preflight Pointer Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_CLOSEOUT_V1`

## What closed

The live import runbook now points operators to the no-mutation preflight tool before any live import.

This makes the safety order explicit:

1. run preflight
2. confirm expected object count
3. only then run the live import command intentionally

## Updated doc

- `docs/public/public-node-local-data-drop-live-import-runbook.md`

Pointer marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_DOC_V1`

## Preflight tool

- `ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY`

## Checkpoint

- commit `4685baa9`
- tag `ckpt-public-node-local-data-drop-live-import-preflight-pointer-green-20260612-150457`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_V1_GREEN`

## Current live state

The live Public Node weighted route remains intentionally unchanged:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

Current mode remains:

- Precision-only green
- Alienware deferred
- cross-box pending

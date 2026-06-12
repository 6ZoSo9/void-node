# Public Node Local Data Drop Import Scratch vs Live Pointer Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_CLOSEOUT_V1`

## What closed

The main Local Data Drop public doc now points operators to the scratch-vs-live import rule.

This makes the import safety distinction visible before an operator accidentally mutates the live Public Node object count.

## Pointer

Updated doc:

- `docs/public/public-node-local-data-drop.md`

Pointer marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_DOC_V1`

Rule doc:

- `docs/public/public-node-local-data-drop-import-scratch-vs-live.md`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1`

## Checkpoint

- commit `735ed8ef`
- tag `ckpt-public-node-local-data-drop-import-scratch-vs-live-pointer-green-20260612-142133`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_V1_GREEN`

## Current live state

The live Public Node weighted route remains intentionally unchanged:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

Current mode remains:

- Precision-only green
- Alienware deferred
- cross-box pending

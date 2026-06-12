# Public Node Local Data Drop Safe Ladder Status Pointer Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LADDER_STATUS_POINTER_CLOSEOUT_V1`

## What closed

The top-level Local Data Drop public doc now points to the live import safe ladder status.

This makes the operator path discoverable from:

- `docs/public/public-node-local-data-drop.md`

To:

- `docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md`

## Safe order now discoverable

1. run preflight
2. generate plan JSON
3. inspect expected object count
4. intentionally run live import only when ready

## Routine checker

- `ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN`

## Checkpoint

- commit `98c5c054`
- tag `ckpt-public-node-local-data-drop-safe-ladder-status-pointer-green-20260612-154229`

## Current live state

- live weighted route remains `object_count=1`
- marker remains `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- mutation performed: false

## Current proof mode

- Precision-only green
- Alienware deferred
- cross-box pending

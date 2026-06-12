# Public Node Local Data Drop Session Status — 2026-06-12

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SESSION_STATUS_20260612_V1`

## Current head

- commit `af364df6`
- tag `ckpt-public-node-local-data-drop-safe-ladder-status-pointer-closeout-green-20260612-154618`

## What is now closed

The Public Node Local Data Drop flow now has a discoverable safe live-import ladder:

1. top-level Local Data Drop doc
2. safe ladder status doc
3. preflight tool
4. plan JSON artifact
5. lite no-build routine smoke
6. intentional live import only when ready

## Current live state

- live weighted route remains `object_count=1`
- marker remains `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- mutation performed: false

## Current proof mode

- Precision-only green
- Alienware deferred
- cross-box pending

## Routine check

Use:

    ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh

Expected marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN`

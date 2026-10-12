# Public Node Local Data Drop Import Stack Lite Smoke Pointer Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_CLOSEOUT_V1`

## What closed

The import stack status document now points routine operators to the lite smoke checker.

This gives us a safe daily/routine check that avoids the long nested proof chain.

## Routine checker

Command:

    ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh

Expected marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN`

## Pointer proof

Command:

    ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke-pointer-proof.sh

Expected marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_V1_GREEN`

## Checkpoint

- commit `89306548`
- tag `ckpt-public-node-local-data-drop-import-stack-lite-smoke-pointer-green-20260612-151802`

## Current live state

- live weighted route remains `object_count=1`
- marker remains `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

- Precision-only green
- Alienware deferred
- cross-box pending

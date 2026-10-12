# Public Node Local Data Drop Import Stack Status v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_V1`

## Status

The Public Node Local Data Drop import stack is Precision-only green.

Alienware is deferred after the storm outage.

Cross-box closeout remains pending until Alienware returns and reruns the Public Node proof stack.

## What is proven

The current import stack proves:

- scratch single-file import works
- scratch multi-file import works
- nested paths are sanitized into object IDs
- scratch import does not mutate the live Public Node object count
- scratch import and live import are documented as separate lanes
- the main Local Data Drop doc points to the scratch-vs-live rule
- the live import runbook exists
- the main Local Data Drop doc points to the live import runbook
- Proof Mode Status Card still reports Precision-only / Alienware deferred / cross-box pending

## Current live baseline

The live Public Node Local Data Drop weighted route remains intentionally unchanged:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current head

- commit `5adf4e77`
- tag `ckpt-public-node-local-data-drop-live-import-runbook-pointer-closeout-green-20260612-143829`
- final marker `VOID_PUBLIC_NODE_LIVE_IMPORT_POINTER_FINAL_GREEN`

## Operator rule

Use scratch import for proofs and tests.

Use live import only when intentionally changing what the Public Node serves.

A live import is a public surface mutation and may require updating proofs that expect `object_count=1`.

## Key docs

- `docs/public/public-node-local-data-drop.md`
- `docs/public/public-node-local-data-drop-import-scratch-vs-live.md`
- `docs/public/public-node-local-data-drop-live-import-runbook.md`
- `docs/public/public-node-alienware-rejoin-runbook.md`

## Key proof markers

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_V1_GREEN`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_V1_GREEN`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1_GREEN`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_CLOSEOUT_V1_GREEN`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_CLOSEOUT_V1_GREEN`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_POINTER_CLOSEOUT_V1_GREEN`
- `VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_CLOSEOUT_V1_GREEN`

## Not claimed

This status does not claim cross-box green.

This status does not claim Alienware has rejoined.

This status does not claim live import has been executed.

## Lite smoke checker <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_DOC_V1 -->

For routine checks, use the lite smoke instead of the full nested proof stack.

The lite smoke avoids TypeScript builds and nested proof chains.

Command:

    ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh

Expected marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN`

Use the full proof stack only when committing, changing runtime behavior, or preparing a larger closeout.

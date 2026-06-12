# Public Node Local Data Drop Live Import Runbook Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_CLOSEOUT_V1`

## What closed

The Public Node now has a proven live import runbook.

This runbook does not mutate live data.

It defines the future operator path for intentionally changing the live Public Node Local Data Drop object set.

## Runbook

- `docs/public/public-node-local-data-drop-live-import-runbook.md`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1`

## Checkpoint

- commit `4164503c`
- tag `ckpt-public-node-local-data-drop-live-import-runbook-green-20260612-142934`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1_GREEN`

## Guardrail

Live import is a public surface mutation.

Operators should prefer scratch import proofs unless the goal is explicitly to change what `/public-node/local-data-drop/weighted.json` serves.

## Current live state

The live Public Node weighted route remains intentionally unchanged:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Current proof mode

Current mode remains:

- Precision-only green
- Alienware deferred
- cross-box pending

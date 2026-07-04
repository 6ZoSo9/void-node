# VOID Local Multi-Box Runtime Verification Path v1

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1`

VOID now exposes a public-safe local multi-box runtime verification path.

This is a read-only discovery and smoke-verification surface for the current local VOID runtime stack. It is meant for operators, outside testers, and external agents that need a simple route chain to verify the live local multi-box status without guessing endpoints.

## Discovery chain

Start here:

- `/.well-known/void-public-node.json`

Then follow:

- `/public-node/index.json`
- `/public-node/runtime`
- `/public-node/runtime/index.json`
- `/public-node/runtime/local-multibox-status-v1.json`
- `/public-node/runtime/smoke-pack-v1.json`
- `/public-node/runtime/smoke-pack-v1.sh`

Human-facing smoke card:

- `/public-node/runtime#runtime-smoke-check`

## Expected green marker

The downloadable smoke script should print:

`VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN`

## Current local multi-box runtime claim

VOID is observed locally across:

- Precision
- Alienware
- Nimo/N153B

This is a local multi-box runtime status claim, not evidence that the public internet mesh is complete.

## Boundary

This path is public-safe and read-only.

It does not enable or claim:

- mutation routes
- wallet send
- money movement
- buy-VOID fulfillment
- WC-to-VOID swap execution
- validator mutation
- validator admission
- public WC self-serve earning
- public internet mesh completion

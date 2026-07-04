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

<!-- VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1_DOC_START -->
## Canonical closeout rollup

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1`

The local multi-box runtime discovery path now has a canonical closeout rollup:

- JSON: `/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json`
- HTML: `/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html`

Expected closeout marker:

`VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1`

The closeout rollup summarizes the full public-safe discovery path from `/.well-known/void-public-node.json` through `/public-node`, `/public-node/index.json`, `/public-node/runtime`, the runtime smoke card, and the downloadable smoke script.

Boundary: this is read-only discovery/status documentation only. It does not enable mutation routes, wallet send, money movement, buy-VOID fulfillment, WC-to-VOID swap execution, validator mutation/admission, public WC self-serve earning, or public internet mesh completion.
<!-- VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1_DOC_END -->

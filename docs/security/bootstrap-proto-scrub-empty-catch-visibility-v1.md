# bootstrap proto scrub empty catch visibility v1

This lane closes the four literal empty catch bodies in `src/bootstrap/proto_scrub.ts`.

## Boundary

This does not change proto scrub behavior.

The early bootstrap scrub still attempts to remove or normalize a pre-existing non-writable `txRoot` descriptor on `Object.prototype`. If any best-effort scrub step unexpectedly fails, the failure is now visible through a non-fatal warning marker instead of disappearing through `catch {}`.

## Required marker

`VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_bootstrap_proto_scrub_empty_catch_visibility.ts

Expected terminal marker:

VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_GREEN

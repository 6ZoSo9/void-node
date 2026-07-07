# mempool best-effort silent catch visibility v1

This audit closes mempool-adjacent best-effort silent catches without changing consensus behavior.

## Boundary

This lane does not change block validity, import validity, tx validity, or consensus validation semantics.

Mempool push/drain/clear failures remain non-fatal, but they no longer disappear through silent `catch {}` blocks.

## Required marker

`VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_mempool_best_effort_silent_catch_visibility.ts

Expected terminal marker:

VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN

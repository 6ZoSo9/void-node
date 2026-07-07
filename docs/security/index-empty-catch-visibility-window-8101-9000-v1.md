# index empty catch visibility window 8101-9000 v1

This lane continues the bounded `src/index.ts` empty-catch cleanup campaign.

## Boundary

This lane only closes line-based exact literal empty catch bodies in `src/index.ts` whose current line positions were within lines 8101-9000.

It does not touch `src/node_core.ts`.

## Behavior

Prior best-effort fallback behavior is preserved. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Required marker

`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_8101_9000_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_index_empty_catch_visibility_window_8101_9000_v1.ts
```

Expected terminal marker:

`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_8101_9000_V1_GREEN`

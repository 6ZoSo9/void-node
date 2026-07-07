# index empty catch visibility window 6301-7200 v1

This lane continues the bounded `src/index.ts` empty-catch cleanup campaign.

## Boundary

This lane only closes line-based exact literal empty catch bodies in `src/index.ts` whose current line positions were within lines 6301-7200.

It does not touch `src/node_core.ts`.

## Behavior

Prior best-effort fallback behavior is preserved. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Required marker

`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_6301_7200_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_index_empty_catch_visibility_window_6301_7200_v1.ts
```

Expected terminal marker:

`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_6301_7200_V1_GREEN`

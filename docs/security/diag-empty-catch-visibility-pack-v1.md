# diag empty catch visibility pack v1

This batch closes exact literal empty catch bodies across the diagnostic file-system autoclose guard files.

## Boundary

This lane does not touch `src/index.ts` or `src/node_core.ts`.

The changed files keep their prior best-effort fallback behavior. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Target files

- `src/diag/fs_autoclose_guard_v1.ts`
- `src/diag/fs_autoclose_guard_v2.ts`

## Required marker

`VOID_DIAG_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_diag_empty_catch_visibility_pack_v1.ts
```

Expected terminal marker:

`VOID_DIAG_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN`

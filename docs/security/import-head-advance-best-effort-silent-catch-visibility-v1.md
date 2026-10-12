# import head advance best-effort silent catch visibility v1

This audit closes import head-advance best-effort silent catches without changing import or consensus behavior.

## Boundary

This lane does not change block validity, import validity, peer selection, or consensus validation semantics.

Head-advance failures remain non-fatal, but failures from these paths no longer disappear through silent `catch {}` blocks:

- `persistHeadAtomic`
- fallback `heads.json` / `head.txt` writes
- contiguous-head `loadBlock` probe
- in-memory `headNumber` / `latestNumber` assignment

## Required marker

`VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_import_head_advance_best_effort_silent_catch_visibility.ts
```

Expected terminal marker:

`VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN`

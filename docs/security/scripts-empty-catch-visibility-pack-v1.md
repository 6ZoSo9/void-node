# scripts empty catch visibility pack v1

This batch closes exact literal empty catch bodies across small script-side helper files.

## Boundary

This lane does not touch `src/index.ts` or `src/node_core.ts`.

The changed files keep their prior best-effort fallback behavior. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Target files

- `scripts/audit_numbers.ts`
- `scripts/compact_rewrite.ts`
- `scripts/import_file.ts`
- `scripts/repair_meta.ts`
- `scripts/scan_bin.ts`
- `scripts/dev_proposer_merge.ts`
- `scripts/follower_once.ts`

## Required marker

`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_scripts_empty_catch_visibility_pack_v1.ts
```

Expected terminal marker:

`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN`

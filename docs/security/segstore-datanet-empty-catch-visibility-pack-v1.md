# segstore datanet empty catch visibility pack v1

This batch closes exact literal empty catch bodies across two bounded non-`src/index.ts` source files with larger remaining clusters.

## Boundary

This lane does not touch `src/index.ts` or `src/node_core.ts`.

The changed files keep their prior best-effort fallback behavior. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Target files

- `src/chain/seg_store.ts`
- `src/http/datanet_routes.ts`

## Required marker

`VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_segstore_datanet_empty_catch_visibility_pack_v1.ts
```

Expected terminal marker:

`VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN`

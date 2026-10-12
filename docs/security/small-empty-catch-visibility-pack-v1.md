# small empty catch visibility pack v1

This batch closes exact literal empty catch bodies across a bounded set of small non-`src/index.ts` files.

## Boundary

This lane does not touch `src/index.ts` or `src/node_core.ts`.

The changed files keep their prior best-effort fallback behavior. Exact empty catch bodies now emit a non-fatal visibility marker instead of disappearing silently.

## Target files

- `src/dev/dev_safe_bundle.ts`
- `src/http/participant_wallet_native_v1.ts`
- `src/http/routes/index_kidx_extras.ts`
- `src/http/tx_routes.ts`
- `src/chain/auto_repair.ts`
- `src/chain/receipts.ts`
- `src/receipts.ts`

## Required marker

`VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_small_empty_catch_visibility_pack_v1.ts
```

Expected terminal marker:

`VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN`

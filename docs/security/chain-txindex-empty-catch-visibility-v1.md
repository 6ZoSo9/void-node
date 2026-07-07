# chain txindex empty catch visibility v1

This lane closes the two literal empty catch bodies in `src/chain/txindex.ts`.

## Boundary

This does not change tx index lookup or shard listing semantics.

The existing fallback behavior remains:

- `listShards()` returns the sorted shards it can read, or an empty list when the directory scan fails.
- `lookupInShard()` returns `{ found:false, n:-1, o:-1 }` when the shard cannot be read or parsed.

Those failures are now visible through a non-fatal warning marker instead of disappearing through `catch {}`.

## Required marker

`VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_chain_txindex_empty_catch_visibility.ts
```

Expected terminal marker:

`VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_V1_GREEN`

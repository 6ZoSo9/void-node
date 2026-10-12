# util txroot empty catch visibility v1

This lane closes the two literal empty catch bodies in `src/util/txroot.ts`.

## Boundary

This does not change txroot computation semantics.

The compat facade still probes `computeTxRoot` first and `merkleRoot` second, but unexpected probe failures are now visible through a non-fatal warning marker instead of disappearing through `catch {}`.

## Required marker

`VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_util_txroot_empty_catch_visibility.ts
```

Expected terminal marker:

`VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_V1_GREEN`

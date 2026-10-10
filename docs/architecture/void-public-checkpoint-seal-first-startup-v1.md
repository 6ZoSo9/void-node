# VOID public checkpoint seal-first startup — source-only correction

## Existing externally observed failure

The external outside-machine acceptance run
[#37991481326](https://github.com/6ZoSo9/void-node/actions/runs/37991481326)
restored the accepted public checkpoint at block **1,951,058** but the live
runner then logged `VOID_SEGSTORE_PATH_CONFINEMENT_V1: inherited proc-fd
content seal mismatch`. This is a trust HOLD, not a successful public
bootstrap or a reason to recompute/ignore the inherited seal.

The existing source constructor order has a reproducible causal mechanism:
`src/index.ts` eagerly created its **own** `new SegStore(DATA_DIR)` before
`__main__` instantiated the real `Node`. The SegStore constructor checks
the restored seal then creates `segments/` and `wal/` as necessary.
The inherited seal includes directory records, so a first construction
can modify the root observed by the second constructor even when no block
payload changes. An unrelated `autoRepairDataDir` callback was scheduled
before Node seal admission and could execute after a failed constructor.
The failed runner did not independently capture the exact pre/post
directory change, so the directory-creation link remains a source-grounded
explanation, **not** a directly observed filesystem diff.

## Exact source fix retained through presale integration

The startup correction merged through
[#2748](https://github.com/6ZoSo9/void-node/pull/2748). The cumulative
presale integration predecessor is exact commit `5c8ce0f1a2dc7f45e522bcbd513ae3f4872117bc` with
`src/index.ts` Git blob `240414e313f44f80d57f4e349be2f1ab3d72fe66`. The combined source is
required to be that complete predecessor plus only the same two seal-first
startup hunks; the economic and operator changes are not rewritten.

The minimal source change performs only two operations:

1. Replace the eager, second SegStore constructor with a **nullable,
   nonconstructing observation alias**, and bind it to the **same** existing
   `node.store` only after `new Node(...)` returns successfully.
   The legacy observer references remain; there is no new independent
   store to mutate the checkpoint during its seal admission.
2. Move the **original unchanged** `VOID_SKIP_AUTOREPAIR`/generic
   `autoRepairDataDir` conditional and its asynchronous callback
   below the successful `new Node(...)` constructor. A failed Node
   constructor cannot leave a scheduled repair callback that acts on
   the rejected inherited checkpoint. Normal startup still schedules
   the original repair; explicit `VOID_SKIP_AUTOREPAIR=1` still skips it.
   No storage-readiness override, public success, authority flag,
   checkpoint seal verifier or filesystem write logic is removed.

The original `src/index.ts` **3,852,487-byte hard ceiling is unchanged**;
the cumulative combined Git blob is `1fde828c97175560f98ab070af33eefc595f8002`, **3852282 bytes**.
The review proof compares the complete combined bytes against an independent
reconstruction from the exact presale predecessor, rejecting any change
beyond the two reviewed startup hunks.

## Synthetic tests — never real checkpoint mutation

The exact source startup slice is extracted from `src/index.ts` and
transpiled by locked TypeScript. A VM with fake Node/store/repair timers
verifies: failed seal admission schedules **zero** timers or repairs;
successful admission reuses the real store and schedules only afterward;
readiness remains pending until the repair finishes; and explicit skip
continues to return skipped without scheduling repair. This tests the
ordering invariant, **not** actual chain replay or network bootstrap.

Node 22/24/26 separately run that proof, with Node24 full typecheck/build
and a cross-node byte-exact receipt comparison. An external outside-machine
bootstrap on a reviewed merged source is still necessary to prove
ready/gap=0, checkpoint trust, live txroot and post-ready grace.

## Remaining HOLD

The startup correction is merged in source, but this cumulative presale
integration is **not deployed** and has not demonstrated a fresh external
checkpoint restoration acceptance on its final merged generation. It does
not grant wallet/key/signer, customer allocation, payment, runtime
service/host, validator, Chain-2050/WC, presale/market, liquidity or funds
action. **Do not** alter the public seal, replay historical checkpoints over
untrusted bytes, or treat successful synthetic tests as external acceptance.

**PROTECT THE CORE.**

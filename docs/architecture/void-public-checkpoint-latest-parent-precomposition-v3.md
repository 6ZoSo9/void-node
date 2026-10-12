# Checkpoint startup: latest parent source precomposition V3

## Scope, source identities, and precedence

**Additive source-only candidate. Not a stack merge, runtime deployment, or
presale authorization.** This file is part of stacked Draft
[PR #2830](https://github.com/6ZoSo9/void-node/pull/2830), with latest
upstream parent [PR #2811](https://github.com/6ZoSo9/void-node/pull/2811).

The review identifies *three separate* immutable code generations:

- Historical canonical main commit `cd7dfcf89fcbe62b5ece9a1e39543b525115a7a8`,
  `src/index.ts` Git blob `1fde828c97175560f98ab070af33eefc595f8002`.
- The unmerged #2830 child's historical #2811 parent commit
  `cfc4a3c388f998bed217001d1ff7eeecaadca6ca`, index blob
  `91151bb6ba5addf061a1a713aeceab142a814312`.
- Newly observed #2811 current commit
  `38fee809db1337610b4b516757c18d6907776743`, index blob
  `40239e0f76aa1edce43523d18c1b57691e41e8cf`.

The original V1 checkpoint script (Git blob
`033018d6caee821b370001d558fcfb81edda48f1`) and already-reviewed
V2 positive proof (Git blob `b03a985c9c4a3dc78ebe3221ee1f2d8b87023b27`)
are **unchanged**. The V1 exact historical negative is never marked green.

## Actual current parent semantic delta

The additive V3 proof reads the latest parent's **immutable commit object** via
`git show <exact-sha>:src/index.ts`; it does **not** replace the checked-out
child's `src/index.ts` or dynamically accept whichever source happens to be
at `HEAD`. Exact blob hashes are required for all three generations.

It demonstrates that the latest parent differs from the old parent by
exactly one 287-byte insertion into the anonymous checkout HTTP 409 response:
a reviewed one-active-request flag that aligns conflict and repeated-request
privacy envelopes. Removing *only that exact insertion* from the new parent
must reproduce the old parent **byte-for-byte**.

Independently, the entire 1,524-byte Node-constructor-to-global-exposure
checkpoint segment in newest #2811 is byte-identical to both the old parent
and canonical main. The constructor remains unique, the eager second
`SegStore` cannot reappear, and the original source byte-size ceiling holds.

Finally V3 **executes the frozen V2 actual TypeScript/VM behavioral proof** on
the old checkout generation. That replay requires a refused inherited seal to
schedule zero auto-repairs, a successful constructor to bind its admitted
store before repairs, normal readiness not to be premature, and the explicit
skip behavior to remain unchanged. Because the latest parent's extracted
checkpoint bytes are identical to the independently executed V2 bytes, this is
a bounded semantic-continuity proof, not runtime attestation.

## CI and remaining HOLD

The additive V3 workflow pins its own source blob, the frozen V1/V2 proof
blobs, both parent source generations, and exact current parent commit. It
runs on **Node 22, 24 and 26**, compares raw proof receipts, performs a full
Node24 typecheck/build and Git diff hygiene. It writes receipts outside the
checked-out source root.

This V3 proof deliberately requires the child branch's *old* index blob:
`child_branch_source_still_old_generation=true`. Therefore even if the
current parent semantic proof is green, the user's stack dry run still
correctly reports **HOLD** for the previous checkpoint V2 pin. This candidate
does **not** advance or merge #2830 onto the new parent, silently repin V1/V2
or qualify a live checkpoint startup.

To close the stack for deployment, separately review the exact merged parent
and child tree, establish a current source-execution lease and obtain
installed-host and economic acceptance. The sibling canonical-producer
source check-to-load/custody gate, Buy VOID payment verification, Epoch-2
signer, custody and the **coupled presale/WC-VOID launch gate** remain closed.

No branch integration, main mutation, node restart, signer/key/customer-ledger
access, payments, Work Credit mutation, wallet/treasury operation, or funds
movement is authorized. **PROTECT THE CORE.**

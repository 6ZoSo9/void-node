# Checkpoint seal-first startup — current Buy VOID source generation V2

## Scope and exact identities

**Source-only / synthetic qualification / DRAFT / HOLD.** This is stacked on
[Buy VOID request-launch-lock Draft #2811](https://github.com/6ZoSo9/void-node/pull/2811)
at exact original parent commit `cfc4a3c388f998bed217001d1ff7eeecaadca6ca`.

The relevant immutable objects are:

- Historical source before seal-first reorder: Git commit
  `5c8ce0f1a2dc7f45e522bcbd513ae3f4872117bc`,
  `src/index.ts` blob `240414e313f44f80d57f4e349be2f1ab3d72fe66`.
- Reviewed post-reorder canonical main:
  `cd7dfcf89fcbe62b5ece9a1e39543b525115a7a8`,
  `src/index.ts` blob `1fde828c97175560f98ab070af33eefc595f8002`.
- Current source in #2811 parent:
  `src/index.ts` blob `91151bb6ba5addf061a1a713aeceab142a814312`.
- **Frozen original proof:** `scripts/prove_void_public_checkpoint_seal_first_startup_v1.mjs`,
  Git blob `033018d6caee821b370001d558fcfb81edda48f1`, deliberately
  unchanged and still refusing the Buy VOID source as a *different generation*.
- New current-positive proof:
  `scripts/prove_void_public_checkpoint_seal_first_startup_current_v2.mjs`.
  This uses all of the prior proof's actual constructor/repair-scheduling
  adversaries, not a replacement source-only success marker.

## Verified reason for the historical red check

The frozen `VOID public checkpoint seal-first startup v1` proof intentionally
requires the **entire** `src/index.ts` blob from canonical main. It refuses
the Buy VOID branch because its overall index file changed; that alone is not
evidence that the checkpoint/repair startup code was altered. The original
proof and its workflow remain immutable to preserve this refusal.

The separate V2 proof first reproduces the **historical exact two-hunk**
pre-seal-to-canonical-main transformation. It then compares the entire
Node-constructor-to-global-exposure checkpoint startup segment **byte for byte**
between immutable main and the exact current Buy VOID index. The constructor
must precede the sole `__apiSegStore = node.store` binding; generic
`autoRepairDataDir` must only schedule after successful inherited seal/node
construction and before `node.start`. A second eager `new SegStore(...)` is
not permitted.

The extracted, real current source startup segment runs inside the same
synthetic TypeScript VM fixture as V1. Rejected inherited seal must schedule
**zero** repair operations; successful admission eventually repairs;
`VOID_SKIP_AUTOREPAIR=1` skips cleanly; readiness must not become GREEN
before scheduled work actually executes.

## Hosted qualification contract

The new `void-public-checkpoint-seal-first-startup-current-v2.yml` workflow
uses supported **Node 22, 24 and 26**, pins the current index, the original
V1 proof and the new V2 proof Git blobs, and runs the full synthetic source
admission test. It independently invokes frozen V1 and **requires** its
specific `candidate source identity` rejection. It builds/typechecks
the full node on Node 24, enforces diff whitespace hygiene, and compares raw
receipt bytes from all three Node major versions.

A future edit to `src/index.ts` must produce a **new**, separately
reviewed source generation. Silently changing either frozen V1 identity or
making the V2 source pin dynamic to HEAD would not qualify a new boot path.

## Explicit exclusions

This is *not* installed machine acceptance, a runtime service restart,
checkpoint repair execution on Precision/Nimo/Xiphos, or a source-immutable
load/execution lease. In particular, the separate
[canonical producer check-to-load P1 in #2822](https://github.com/6ZoSo9/void-node/pull/2822)
remains unresolved and must not be waived by a passing V2 synthetic suite.
Historical V1 remains red on changed index by design; its receipt is not
relabeled GREEN. No wallet, credential, signer, customer ledger, payment,
Work Credit, validator, chain, presale, market or funds authority is granted.

**PROTECT THE CORE.**

# Buy VOID V5 lock / Epoch-2 current-main composition V2

**Status: draft source and CI evidence only. Not a deployment or presale activation authorization.**

## Why V2 exists

The original source-only integration PR [#3402](https://github.com/6ZoSo9/void-node/pull/3402)
was bound to canonical `main@206d3d61e5051704e9fd0c47068bcfe56a15c85f`.
It passed its own two-job source/plan-only proof. Its historical CI wall was
**17 successful, 7 failed**, with older generation-bound jobs correctly
refusing the broader integrated path scope. Do not alter those frozen jobs.

Canonical main subsequently advanced through PR #3400 to
`42dacb5b66e37e1e8814c5c96ab8cbafa5925b2b`, adding **four**
previously absent native-materializer paths, all regular 100644 files.
None overlaps #3402's 63 economic/test paths.

This V2 branch preserves the exact V1 generation and composes the four
new main files in a *separate* two-parent commit. It is a successor,
not a rewrite of #3402 or of any accepted enforcement lock.

## Frozen provenance

| Role | Exact Git commit |
| --- | --- |
| Previous tested integration (#3402) | `fd2fa4e0fbe412cdf31aad12b3f28d93761b013a` |
| Previous canonical main | `206d3d61e5051704e9fd0c47068bcfe56a15c85f` |
| New canonical main | `42dacb5b66e37e1e8814c5c96ab8cbafa5925b2b` |
| New two-parent V2 source composition | `c997196f4990a13615665e96a443d7b593754c08` |
| Composed source tree | `cee12d1beb53e20c2ea6b12a10fdd6452101e696` |
| Proposed V5 lock (#3398, still draft) | `c005ca30ab156427deb7731d596cde52d7a669ac` |

The composed V2 commit has exactly two parents in the specified
order: prior V1 integration first, new main second. Compared with
the prior V1 integration, it adds **only** these four native-materializer
files at the exact Git blobs and modes from new main:

- `.github/workflows/buy-void-epoch2-dormant-binder-native-materializer-v1.yml`
- `docs/operators/buy-void-epoch2-dormant-binder-native-materializer-v1.md`
- `scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py`
- `scripts/prove_buy_void_epoch2_dormant_binder_native_materializer_v1.py`

Compared with the new canonical main, the V2 composed tree carries
**exactly 63** prior V1 economic/test paths, without changing their
blobs or executable modes. All previous proof files and accepted V5
candidate/projection/lock identities remain frozen.

## Proof and inert CI

`scripts/prove_buy_void_v5_epoch2_main_composition_v2.py`
requires exact parent order, tree, 4-path new-main delta, 63-path
economic/test identity, 3 new local proof/document/workflow paths,
and an initially clean source worktree.

It independently verifies all **49 protected source inventory rows**
against exact visible Git blob hashes and modes. The full accepted
V5 source identity is fixed at:

`1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`.

The hosted workflow builds and typechecks with the locked package
generation. It runs the real V7 deployment-receipt planner only with
`--plan`, exact HEAD/tree and the tracked V5 lock. The output
must be `PLAN_GREEN` and **no receipt may be created**.

It also reruns the canonical native-materializer's own read-only
`--self-test` against the frozen executable source generation where
safe. The historical narrow-scope workflow remains separate and
unmodified; its failures are not relabeled or waived.

## Authority

Even if all focused proofs are green:
`deployed_artifact_generation_verified=false`,
`runtime_mount_authority=false`,
`production_source_finality_authority_ready=false`,
`public_presale_activation=false`, and `funds_movement=false`.

No production installation on Precision/Nimo/Xiphos; no service
restart, credentials, signing, customer payments, Chain 2050
transaction, WC/VOID pool opening, treasury or funds movement.

Both parent PRs (#3398 and #3402) remain drafts. Future canonical
main commits demand *another explicit identity qualification*.
Do not force-push or merge without fresh branch-protection review.

**PROTECT THE CORE.**

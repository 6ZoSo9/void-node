# Canonical producer source custody — read-only at-use preflight v1

## Current-main requalification — October 12, 2026

This candidate is a **source-only re-stage**, not a deployment: #2833's
exact `src/index.ts` Git blob already matches reviewed V3 source identity
`40239e0f76aa1edce43523d18c1b57691e41e8cf`. The V1/V2/V3
canonical observer code and frozen behavioral proof identities are copied
byte-for-byte from historic 22/22-green but superseded Draft #2822.
The delta is the parent repository generation and fresh CI, not invented
permission to execute a mutable developer checkout. The original V1
refusal to start on unknown source remains a correct **negative control**.

This work cannot be merged into main independently of #2833's exact
source intake branch and an independently planned protected-root
installation. Real Precision/Nimo/Xiphos hosts are not modified.

## Why this guard exists

The existing canonical producer launcher checks the checked-out `src/index.ts`
Git blob and HEAD, then starts Node with the TSX loader and immutable versioned
self-HTTP observer preload. An **unprivileged same-UID writer** could modify an
ordinary writable Git worktree after either source check and before the TSX
loader reads executable source. Additional pathname rechecks do not establish
an immutable execution generation.

This candidate adds a **source-custody prerequisite** before canonical
producer `exec`. It restages reviewed source from closed, unmerged Draft #2822 in a new
stacked candidate on current-main Buy VOID intake Draft #2833. It **does not merge,
install, deploy, restart, or enable** any service.

## Real acceptance boundary

The canonical role must run as a **non-root, nonprivileged UID** from a
**root-owned source tree** beneath root-owned ancestry. The source checkout,
`.git`, runtime guard, loader entry, and every descendant directory/file must
be inaccessible for writes by the service UID, with no group/other writable
permissions. The checker refuses elevated Linux capabilities, mutable ancestors
(including an ordinary user-owned home directory), unknown filesystem node
types, unavailable ownership/writability checks, unreviewed source symlinks
escaping the tree, absent loader components and excessive tree breadth/depth.

Safe internal symlinks may exist only if owned by root, contained under the
same protected source root and their resolved targets are within the
recursively checked non-writable tree. The checker enumerates all descendants
rather than trusting only `src/index.ts` or a single SHA. The trusted
production loader path is also inside the protected generation.

A successful preflight means a **nonprivileged writer sharing the service UID
cannot change checked source files or replace directory entries between the
Git identity check, preload, and subsequent TSX execution** using ordinary
DAC/ACL privileges. The process must separately verify the reviewed
`src/index.ts` Git blob. The guard **does not** defend against a privileged
root/mount-namespace actor, FUSE backing-store owner bypass, a privileged
deployment process rewriting the tree, a preexisting privileged writable
descriptor, or malicious code executing before the trusted launcher.

## Deployment consequences

Current developer worktrees under a writable home directory are expected to
return `VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_HOLD`. **Do not disable
this test** to make a service start. A separately authorized installation must
stage/verify an entirely protected root-owned release tree (including
`.git`, Node loader/dependencies), run the service as an unprivileged UID,
and keep node data, wallets, keys, customer ledgers, logs, and temp files in
a **different** bounded writable data root. No private key or user data may
be copied into this release-tree migration as part of this source patch.
Any actual host installation/cutover requires its own reviewed plan and
independent at-use evidence.

The canonical role calls the read-only native checker
`runtime/canonical-producer-source-custody-v1.cjs` before the earlier
versioned source-blob selector. The noncanonical follower role is unaffected.

## Automated non-operational qualification

`scripts/prove_canonical_producer_source_custody_v1.mjs` creates one uniquely
named **disposable root-owned fixture under /var/lib on a GitHub-hosted Linux
runner** using runner-local `sudo -n`. It runs the real Node checker under
the runner's non-root identity. It requires both successful protected-tree
acceptance and actual kernel-denied attempts to write the root-owned source,
plus fail-closed owner, mode, parent, escaped-symlink and mutable runtime-state
adversaries. All fixture paths are ephemeral and deleted on the runner.

`.github/workflows/canonical-producer-source-custody-v1.yml` runs these
real-kernel controls under Node.js 22, 24 and 26 and syntax-checks the
canonical launcher. **Synthetic runner evidence is not installation proof.**

## Reviewed current V3 source generation — October 12, 2026

The stacked child retains the original V1 guard, V1 proof, V2 guard,
V2 proof and V2 source-dispatch proof **byte-for-byte**. A separately
versioned current V3 copies the reviewed V2 self-HTTP suppression behavior
with only three reviewed differences: its marker, self-stack filename and
the exact present parent `src/index.ts` Git blob
`40239e0f76aa1edce43523d18c1b57691e41e8cf`. This is the
unchanged operational legacy-observer callsite contract plus the parent's
new Buy VOID public 409 privacy envelope; it is not a change of validator,
consensus, or external HTTP permissions.

The launcher picks V1, V2 or V3 only for an exact reviewed source Git blob,
then independently requires source-custody preflight before any canonical
Node/TSX load. The versioned V3 dispatcher requires frozen historical
Git blobs and exact V2→V3 code parity, exercises all three shell selector
branches and unknown-source refusal, proves the old V1/V2 modules
reject current V3 index bytes, and runs the complete V3 observer behavioral
suite. `.github/workflows/canonical-producer-legacy-self-http-observers-v1.yml`
runs the composed proof on Node 22, 24 and 26.

**Important:** GitHub PR checks run on a synthetic merge of the child
with the #2833 parent generation anchored at
`b201ce89c6583737042fa21010be4eb6cdcae06b` (base main
`e8ff33dc7c8873fea1e1fb8ddc67cb45cdb3113b`). Parent and child index
Git blob `40239e0f76aa1edce43523d18c1b57691e41e8cf` must remain exact.
Any later parent source or generation change must be accepted as a
*new reviewed source generation*—never silently repin a frozen guard.
The separate root-owned protected release ancestry remains the at-use
prerequisite; a green source test alone is not an installed service proof.

## Remaining blockers

This is a **candidate** source-custody strategy, not unconditional closure of
the P1 check-to-load race. It requires independent review of source/ancestor
ownership and filesystem mount trust on the **actual service host**, source
generation alignment with current parent #2833, complete canonical observer
source-contract behavior, startup configuration, and an operation-bound
immutable release/cutover acceptance. The V1/V2 historical observer proofs
remain frozen. No readiness, payment, fulfillment, Work Credits, VOID presale,
market launch, signer/treasury or funds authority is granted.

PROTECT THE CORE.

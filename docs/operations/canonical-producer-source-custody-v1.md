# Canonical producer source custody — read-only at-use preflight v1

## Why this guard exists

The existing canonical producer launcher checks the checked-out `src/index.ts`
Git blob and HEAD, then starts Node with the TSX loader and immutable versioned
self-HTTP observer preload. An **unprivileged same-UID writer** could modify an
ordinary writable Git worktree after either source check and before the TSX
loader reads executable source. Additional pathname rechecks do not establish
an immutable execution generation.

This candidate adds a **source-custody prerequisite** before canonical
producer `exec`. It is part of stacked Draft #2822 and **does not merge,
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

## Remaining blockers

This is a **candidate** source-custody strategy, not unconditional closure of
the P1 check-to-load race. It requires independent review of source/ancestor
ownership and filesystem mount trust on the **actual service host**, source
generation alignment with current parent #2811, complete canonical observer
source-contract behavior, startup configuration, and an operation-bound
immutable release/cutover acceptance. The V1/V2 historical observer proofs
remain frozen. No readiness, payment, fulfillment, Work Credits, VOID presale,
market launch, signer/treasury or funds authority is granted.

PROTECT THE CORE.

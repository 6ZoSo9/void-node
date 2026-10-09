# Buy VOID enforcement V5 candidate source scope — unmounted covariance fix

## Defect and provenance

Draft permanent custody fence successor [#2717](https://github.com/6ZoSo9/void-node/pull/2717)
introduces an unmounted `src/economic/buy_void_custody_high_water_fence_storage_v1.mjs`.
The historical V5 candidate derivation used
`git diff --quiet SOURCE_HEAD HEAD -- src/economic ...`,
treating **every** unrelated `src/economic` source addition as a change
to the compiled delivery enforcement executable closure. This caused
Node 22/24/26 failures in each of two historical attestation workflows.

This source-only repair adapts the reviewed closure-scoped candidate
logic already present in [PR #2675](https://github.com/6ZoSo9/void-node/pull/2675),
source blob `664b870a30a1f2e8692d4f14b3bff6636e5c411c`,
while retaining this branch's original reviewed ancestor and its exact
historical V4/V5 source/manifest pins unchanged.

## Revised admission boundary

The derivation still requires the same `SOURCE_HEAD` ancestor, compiler,
package lock, immutable V1/V4/V4-compiled manifest bytes and all source pins.
It first computes `closedArtifacts()` by scanning the compiled delivery
enforcement entrypoint and its statically reachable relative-import graph.
The exact corresponding `src/*.ts` source paths and explicit `INPUTS`
(build files, lockfile, TypeScript configs, build scripts, Dockerfile) then
form the source+build `git diff --quiet` boundary.

Changes to a **reachable compiled module source** or reviewed build input
still HOLD. An added unmounted custody module is not retroactively declared
part of the already-reviewed compiled delivery enforcement closure.

Unrecognized imports and dynamic loaders are still rejected or unqualified.
Historical manifest identities are not rewritten and this change does NOT
grant dynamic-tool acceptance, executable closure completeness or runtime
activation authority.

## Qualification

The same exact-head Node 22/24/26 V5 candidate workflows are the
qualification gates. Prior GREEN results from a different head are not proof.
Keep PR #2717 in Draft until fresh terminal CI and independent review.
There is no payment, reserve/recover, custody service, signer, wallet,
treasury, inventory, market/presale or funds mutation here.

PROTECT THE CORE.

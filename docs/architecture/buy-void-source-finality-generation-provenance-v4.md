# Buy VOID source-finality generation provenance V4

## Purpose

V4 is a source-only successor above the repaired V3 source-finality composition. It closes a narrower provenance seam: caller assertions are not sufficient to claim that reviewed source files are present. V4 verifies the exact reviewed runtime source-file bytes before it enters V3.

It deliberately does **not** claim that the executing compiled/deployed artifact has been independently attested. Therefore the established source-finality truth remains:

```text
source_generation_verified=false
production_source_finality_authority_ready=false
```

## Exact stack

- current repository `main` after #1473 merge: `505364d42cf34e59c2ecca6865bc640d4f6323d3`
- #1471 finalized-source adapter semantic generation: `036c34a479d8dacbfd663fcb610adabbd0008428`
- #1472 repaired authority semantic generation: `70a12eeb30c5beb2f05e789bab9e75b57cc50e4d`
- #1473 repaired V3 semantic source generation: `3ab4b2ace3f3cf5a8d6f33ef9a0b21926be46962`
- #1473 final proof/workflow head before merge: `4941646e7a004e14de9429dfc9723b7b6de44966`
- V4 branch: `feat/buy-void-source-finality-generation-provenance-v4-20260907`
- state: source/proof/package/docs/CI only / unmounted / Draft until fresh acceptance

The V4 reviewed-source manifest pins semantic source-changing commits, not later proof-only or workflow-only heads.

## No caller provenance input

The V4 operation input remains exactly the V3 operation input:

```text
request
policy.source_finality_policy
policy.authority_policy_generation
policy.total_timeout_ms
```

There is no source-generation manifest, commit SHA, blob SHA, artifact path, or verification flag supplied by the caller.

## Reviewed source-file verification

V4 pins five exact runtime source identities:

1. `src/economic/buy_void_source_finality_authenticated_composition_v3.ts`
2. `src/economic/buy_void_source_finality_authority_v2.ts`
3. `src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts`
4. `src/economic/buy_void_payment_rpc_observer_v1.ts`
5. `src/economic/buy_void_verified_payment_v2.ts`

For every file V4 records the exact reviewed source commit SHA and exact Git blob SHA-1 from that semantic generation.

Before entering V3, V4:

- derives source pathnames from `import.meta.url`, never caller input;
- requires a regular non-symlink pathname;
- opens the file read-only with `O_NOFOLLOW` where supported;
- requires a single-link bounded regular file;
- keeps descriptor identity, size and modification time stable across the read;
- recomputes Git blob identity from the actual bytes; and
- requires exact equality with the internally pinned reviewed blob.

Any unavailable, replaced, aliased, unstable, malformed or byte-different source fails closed before V3 can issue an RPC.

The five-record manifest is also committed under:

```text
VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4
```

which binds repository identity, marker/version, source paths, reviewed commit SHAs and exact blob identities.

## Source and compiled module layout

V4 does not statically import the V3 runtime function. It keeps only type-only imports, verifies the reviewed source-file set first, then dynamically imports V3.

The verifier admits only two module layouts:

- source execution from `src/economic`; and
- normal compiled execution from `dist/economic`.

Compiled execution maps back to the reviewed `src/economic` source set. Any other module location fails closed with `source_files_module_location_invalid`.

A module already loaded elsewhere in the same process, or a compiled deployment whose executing JavaScript has not been independently attested, still cannot be proven equivalent merely by checking source files on disk. V4 therefore does not upgrade `source_generation_verified`.

## One total deadline including V4 preflight

V4 now starts the operation deadline before source-file verification and dynamic V3 import. The admitted total timeout remains a positive integer no greater than 120000 ms.

After source verification and after dynamic import, V4 computes only the remaining budget. A zero remaining budget returns:

```text
source_finality_total_deadline_exceeded
```

before V3/RPC entry. V3 receives only the remaining budget, not a fresh copy of the original timeout. V4 rechecks the original deadline after V3 returns and cannot report success after that deadline has expired.

This prevents source verification or import latency from being excluded from a successful `total_operation_deadline_verified=true` result. The focused regression deliberately slows reviewed-source reads beyond a tiny total budget and requires a deadline HOLD before any external RPC can begin.

## Production package source availability

The normal production image previously copied only `dist`, `package.json`, and `node_modules`, while compiled V4 intentionally resolves its five reviewed `.ts` files under `/app/src/economic`. That packaging mismatch would make the verifier HOLD in the normal container.

The final Docker stage now copies exactly the five reviewed source files into `/app/src/economic`; it does not copy the whole source tree for this purpose.

The dedicated workflow builds the production Docker image on the Node 24 leg and executes the compiled V4 verifier **inside that final image**. Acceptance requires the packaged verifier to report all five reviewed source files present and byte-correct.

This package-presence proof still does not independently attest that deployed JavaScript equals the reviewed compiled generation; that remains the next external compiled/deployed-artifact gate.

## Successful V4 truth

A successful V4 result may carry:

```text
reviewed_source_files_verified=true
authenticated_transport_identity_verified=true
total_operation_deadline_verified=true
observation_generated_in_composition=true
```

It must also carry:

```text
source_generation_verified=false
deployed_artifact_generation_verified=false
remote_provider_identity_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

`reviewed_source_files_verified=true` means only that the exact pinned source files matched their reviewed Git blob identities immediately before V3 entry.

It is not equivalent to compiled/deployed artifact provenance.

## Compiled/deployed artifact boundary

The next provenance gate must be external to the executing source-finality module and must bind the exact artifact that will actually run. A suitable later design can use a content-addressed packaged artifact, pre-execution verifier, signed/reviewed release manifest, or another independently anchored generation mechanism.

V4 intentionally does not convert package source-file presence into deployed-artifact authority. Until the deployed artifact is independently bound, `source_generation_verified` remains false.

## Source-finality threat-model boundary

V4 does not change the existing source-finality negatives:

- same-provider consistency is not independent provider identity;
- provider quorum is not proved; and
- header ancestry/light-client finality is not proved.

Ancestry/provider-quorum become mandatory only if the selected production threat model requires them.

## CI trigger and proof boundary

The V4 pull-request workflow triggers not only on V4 source/proof/docs/workflow changes, but also on `Dockerfile` and every one of the five pinned runtime-source paths. A change to a pinned source therefore cannot silently leave V4 provenance stale without running its focused gate.

The focused proof/wall:

- recomputes all five reviewed Git blob identities from checked-out bytes;
- mutates an in-memory byte of each and proves identity changes;
- proves source-file verification occurs before dynamic V3 entry;
- proves V4 preflight consumes the original total deadline;
- runs one complete ten-call loopback V4 composition;
- proves `reviewed_source_files_verified=true` while both source-generation and deployed-artifact verification remain false;
- rejects caller generation/provenance injection before network;
- preserves bad-RPC-fingerprint zero-call behavior;
- reruns the repaired V3 ordinary and truncated-response proofs plus #1472 and #1471 focused proofs;
- builds the normal repository output and proves compiled-layout source resolution;
- builds the production Docker image and proves the final packaged runtime contains the exact five reviewed source files; and
- proves no runtime route, source mutation, wallet, signer, transaction, inventory, Chain-2050 or money authority was introduced.

No live Base or Ethereum RPC is used. The focused network proofs use only ephemeral loopback JSON-RPC harnesses.

## Remaining production gates

After V4 is independently reviewed and exact-head green:

1. independently bind the exact compiled/deployed source-finality artifact generation;
2. reviewed V4/V-next -> hash-bound finalized-payment handoff -> Chain-2050 reservation integration;
3. Chain-2050 payment-keyed finite-inventory reservation/fulfillment implementation;
4. source-backed Chain-2050 ancestry/finality authority;
5. source-chain ancestry/provider-quorum only if required by production policy; and
6. separate deployment, live-RPC, signer, transaction, inventory-funding, legal and public-presale activation authorization.

## Authority boundary

Source/proof/package/docs/CI and read-only source-file verification only.

No deployment/restart, runtime route mount, production live RPC, credential, key, wallet or signer access, transaction construction/signing/broadcast, inventory mutation/funding, Chain-2050 mutation, validator or Work Credit mutation, public presale activation, treasury/liquidity action or funds movement is performed by this lane.

Refs #1301 #1463 #1465 #1469 #1470 #1471 #1472 #1473.

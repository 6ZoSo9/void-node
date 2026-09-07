# Buy VOID source-finality generation provenance V4

## Purpose

V4 is a source-only successor stacked on the repaired V3 source-finality composition.
It closes one narrower provenance seam: caller assertions are no longer sufficient to
claim that the reviewed source files are present. V4 verifies the exact reviewed
runtime source-file bytes before it enters V3.

It deliberately does **not** claim that the executing compiled/deployed artifact has
been independently attested. Therefore the established #1472/#1473 truth remains:

```text
source_generation_verified=false
production_source_finality_authority_ready=false
```

## Exact stack

- repository `main`: `0cb5832f88eab7c9a1678328e546f2a307b71530`
- #1471 synchronized source generation: `036c34a479d8dacbfd663fcb610adabbd0008428`
- #1472 exact source-finality authority: `28f47db9e5c4f0064112591eb75b4ef747946c8c`
- #1473 exact repaired V3 composition: `d72569a749e47243eeed1a9b61a5e9caa06dcc3f`
- V4 branch: `feat/buy-void-source-finality-generation-provenance-v4-20260907`
- state: source-only / stacked / unmounted / Draft

## No caller provenance input

The V4 operation input remains exactly the V3 operation input:

```text
request
policy.source_finality_policy
policy.authority_policy_generation
policy.total_timeout_ms
```

There is no source-generation manifest, commit SHA, blob SHA, artifact path, or
verification flag supplied by the caller.

## Reviewed source-file verification

V4 pins five exact runtime source identities:

1. `src/economic/buy_void_source_finality_authenticated_composition_v3.ts`
2. `src/economic/buy_void_source_finality_authority_v2.ts`
3. `src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts`
4. `src/economic/buy_void_payment_rpc_observer_v1.ts`
5. `src/economic/buy_void_verified_payment_v2.ts`

For every file V4 records the exact reviewed source commit SHA and exact Git blob
SHA-1 from that generation.

Before entering V3, V4:

- derives source pathnames from `import.meta.url`, never caller input;
- requires a regular non-symlink pathname;
- opens the file read-only with `O_NOFOLLOW` where supported;
- requires a single-link bounded regular file;
- keeps descriptor identity, size and modification time stable across the read;
- recomputes Git blob identity from the actual bytes; and
- requires exact equality with the internally pinned reviewed blob.

Any unavailable, replaced, aliased, unstable, malformed or byte-different source
fails closed before V3 can issue an RPC.

The five-record manifest is also committed under:

```text
VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4
```

which binds repository identity, marker/version, source paths, reviewed commit SHAs
and exact blob identities.

## Import-order repair

V4 does not statically import the V3 runtime function. It keeps only type-only
imports, verifies the reviewed source-file set first, then dynamically imports V3.
This removes the simple load-before-verify ordering defect from the first V4 draft.

That ordering improvement still does not make the process self-attesting. A module
already loaded elsewhere in the same process, or a compiled deployment that does not
execute the reviewed `.ts` bytes directly, cannot be proven equivalent merely by
checking source files on disk. For that reason V4 does not upgrade the established
`source_generation_verified` flag.

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

`reviewed_source_files_verified=true` means only that the exact pinned source files
matched their reviewed Git blob identities immediately before V3 entry.

It is not equivalent to compiled/deployed artifact provenance.

## Compiled/deployed artifact boundary

The next provenance gate must be external to the executing source-finality module and
must bind the exact artifact that will actually run. Suitable later designs may use a
content-addressed packaged artifact, pre-execution verifier, signed/reviewed release
manifest, or another independently anchored generation mechanism.

V4 intentionally does not choose or simulate that production packaging authority.
Until the deployed artifact is independently bound, `source_generation_verified`
remains false.

## Source-finality threat-model boundary

V4 does not change the existing source-finality negatives:

- same-provider consistency is not independent provider identity;
- provider quorum is not proved; and
- header ancestry/light-client finality is not proved.

Ancestry/provider-quorum become mandatory only if the selected production threat
model requires them.

## Proof boundary

The focused proof:

- recomputes all five reviewed Git blob identities from checked-out bytes;
- mutates an in-memory byte of each and proves identity changes;
- proves source-file verification occurs before dynamic V3 entry;
- runs one complete ten-call loopback V4 composition;
- proves `reviewed_source_files_verified=true` while both source-generation and
  deployed-artifact verification remain false;
- rejects caller generation/provenance injection before network;
- preserves bad-RPC-fingerprint zero-call behavior;
- proves no runtime route, source mutation, wallet, signer, transaction, inventory,
  Chain-2050 or money authority was introduced; and
- reruns the V3, #1472 and #1471 focused proofs in the dedicated workflow.

No live Base or Ethereum RPC is used. The focused proof uses only an ephemeral
loopback JSON-RPC harness.

## Remaining production gates

After V4 is independently reviewed and exact-head green:

1. independently bind the exact compiled/deployed source-finality artifact generation;
2. reviewed V4/V-next -> hash-bound finalized-payment handoff -> Chain-2050 reservation integration;
3. Chain-2050 payment-keyed finite-inventory reservation/fulfillment implementation;
4. source-backed Chain-2050 ancestry/finality authority;
5. source-chain ancestry/provider-quorum only if required by production policy; and
6. separate Ready, merge, live-RPC, deployment, signer, transaction,
   inventory-funding, legal and public-presale activation authorization.

## Authority boundary

Source/proof/docs/CI and read-only source-file verification only.

No deployment/restart, runtime route mount, production live RPC, credential, key,
wallet or signer access, transaction construction/signing/broadcast, inventory
mutation/funding, Chain-2050 mutation, validator or Work Credit mutation, public
presale activation, treasury/liquidity action or funds movement is authorized or
performed by this lane.

Refs #1301 #1463 #1465 #1469 #1470 #1471 #1472 #1473.

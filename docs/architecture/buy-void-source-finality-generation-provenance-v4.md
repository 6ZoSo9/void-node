# Buy VOID source-finality generation provenance V4

## Purpose

V4 is a source-only successor stacked on the reviewed V3 source-finality composition.
It closes the remaining caller-assertion seam around the source generation consumed by
that composition without claiming that a compiled or deployed artifact has already
been independently attested.

V3 already provides:

- module-owned read-only Base/Ethereum RPC transport;
- exact RPC URL fingerprint and configured RPC identity binding;
- one absolute total operation deadline over the full finalized-source observation;
- direct #1471 observation -> #1472 authority composition;
- exact payment, receipt-block hash and finalized-reference hash binding; and
- no wallet, signer, transaction, inventory, Chain-2050 or money authority.

V3 deliberately returned:

```text
source_generation_verified=false
production_source_finality_authority_ready=false
```

because its reviewed upstream generation was expected but not verified from the
runtime source bytes themselves.

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
`source_generation_verified` field supplied by the caller.

V4 verifies generation before calling V3. If that verification does not succeed,
no source-chain RPC is attempted.

## Runtime source-generation verification

V4 pins five exact runtime source identities:

1. `src/economic/buy_void_source_finality_authenticated_composition_v3.ts`
2. `src/economic/buy_void_source_finality_authority_v2.ts`
3. `src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts`
4. `src/economic/buy_void_payment_rpc_observer_v1.ts`
5. `src/economic/buy_void_verified_payment_v2.ts`

For every source file V4 records:

- exact reviewed source commit SHA; and
- exact Git blob SHA-1 from that reviewed commit generation.

At operation time, before RPC:

- the source pathname is derived from `import.meta.url`, not caller input;
- the pathname must be a regular non-symlink file;
- the file is opened read-only with `O_NOFOLLOW` where supported;
- the opened generation must be a single-link regular file within the bounded source-file size;
- descriptor identity, size and modification time must remain stable across the read;
- V4 recomputes the exact Git blob object identity from the bytes; and
- every recomputed blob identity must equal the internally pinned reviewed blob.

Any unavailable, replaced, aliased, changed, malformed or byte-different source
fails closed before V3 can issue a network request.

The exact five-record reviewed-source manifest is also deterministically committed
under a SHA-256 generation identity:

```text
VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_GENERATION_SHA256_V4
```

This SHA-256 commits the repository identity, V4 marker/version, source paths,
reviewed commit SHAs and exact Git blob identities. It is not caller controlled.

## Successful V4 truth

Only after the exact runtime source generation verifies and V3 itself succeeds may
V4 return:

```text
source_generation_verified=true
reviewed_source_generation_verified=true
authenticated_transport_identity_verified=true
total_operation_deadline_verified=true
observation_generated_in_composition=true
```

The meaning of `source_generation_verified=true` is deliberately narrow: the
reviewed runtime **source files consumed by this source-mode composition** matched
the exact internally pinned Git blob identities before the operation began.

It does not mean that an independently packaged, compiled or deployed artifact has
been cryptographically attested.

Therefore V4 also hard-codes:

```text
deployed_artifact_generation_verified=false
remote_provider_identity_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

## Compiled/deployed artifact boundary

A production deployment may execute emitted JavaScript without the reviewed `.ts`
source files present beside the module. V4 intentionally does not reinterpret that
absence as verified provenance. Source-mode verification will HOLD when the reviewed
source bytes are unavailable.

A later reviewed packaging/deployment generation must independently bind the exact
built artifact or release generation before `deployed_artifact_generation_verified`
can become true. V4 does not manufacture that claim from a source checkout.

## Source-finality threat-model boundary

V4 does not change the existing source-finality threat-model negatives:

- exact same-provider consistency is still not independent provider identity;
- no independent provider quorum is claimed; and
- no header ancestry/light-client proof is claimed.

Whether ancestry and/or independent-provider quorum are mandatory production gates
remains a separate policy decision. V4 does not silently promote either property.

## Proof boundary

The focused proof:

- recomputes all five reviewed Git blob identities from the checked-out bytes;
- mutates an in-memory byte of each file and proves the blob identity changes;
- runs one complete ten-call loopback V4 source-finality composition;
- proves successful output carries source-generation verification while deployed
  artifact verification remains false;
- proves caller generation/provenance injection is rejected before network;
- proves a bad RPC URL fingerprint still reaches zero RPC calls;
- proves no caller provenance parameter, runtime route, source mutation, wallet,
  signer, transaction, inventory, Chain-2050 or money authority was introduced; and
- reruns the V3, #1472 and #1471 focused proofs in the dedicated workflow.

No live Base or Ethereum RPC is used by publication or CI. The only network surface
in the focused proof is an ephemeral loopback JSON-RPC harness.

## Remaining production gates

After V4 source provenance is independently reviewed and exact-head green, remaining
work still includes:

1. compiled/deployed-artifact generation attestation for the actual production form;
2. reviewed V4 -> hash-bound finalized-payment handoff -> Chain-2050 reservation integration;
3. Chain-2050 payment-keyed finite-inventory reservation/fulfillment implementation;
4. source-backed Chain-2050 ancestry/finality authority;
5. source-chain ancestry/provider-quorum implementation only if required by the
   selected production threat model; and
6. separate Ready, merge, live-RPC, deployment, signer, transaction,
   inventory-funding, legal and public-presale activation authorization.

## Authority boundary

Source/proof/docs/CI and read-only runtime source-file verification only.

No deployment/restart, runtime route mount, production RPC execution, credential,
key, wallet or signer access, transaction construction/signing/broadcast, inventory
mutation/funding, Chain-2050 mutation, validator or Work Credit mutation, public
presale activation, treasury/liquidity action or funds movement is authorized or
performed by this lane.

Refs #1301 #1463 #1465 #1469 #1470 #1471 #1472 #1473.

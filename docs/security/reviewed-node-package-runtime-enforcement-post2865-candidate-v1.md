# Reviewed Node package runtime — post-#2865 enforcement candidate V1

Marker: `VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_POST2865_CANDIDATE_V1`.

Status: **source/CI candidate only; profile not accepted**.

## Purpose

The previously reviewed combined `ethers + express` package identity was
explicitly bound to the pre-remediation package generation. Dependency
remediation PR #2865 has now merged to canonical main, so that identity is
historical.

This lane derives the replacement candidate from the merged audited generation.
It does not accept the profile and does not claim a complete enforcement graph.

## Exact source generation

```text
source_parent = 35ff3f8ec453f8104b59967580a84347d6bc1d23
package.json  = 14fbdf5717b07fd4c734f5da7a8e84ed59bee93f
package-lock  = 15b5c82ea36f13079a2f9e8863722f654eb3f201
ethers        = 6.17.0
express       = 4.22.3
```

The existing reviewed ethers V2 profile remains current and is re-enforced
before the combined profile is derived:

```text
profile_id = voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451
aggregate  = 5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73
```

The proof pins the collector, ethers V2 proof and ethers V2 profile bytes.

## Candidate derivation

Node 22, 24 and 26 each:

1. check out the exact candidate without stored Git credentials;
2. install the exact audited lock with lifecycle scripts disabled;
3. typecheck;
4. re-run the current reviewed ethers V2 proof;
5. use the reviewed package collector with roots exactly
   `["ethers","express"]`;
6. require the merged package/lock Git blobs and exact root versions;
7. emit the full combined profile candidate; and
8. compare all three candidate envelopes byte-for-byte.

No package list, file inventory, aggregate, profile ID, or candidate hash is
hand-authored. Those values must come from hosted derivation.

## Composition boundary

This profile candidate is independent of the provider-implementation closure
being derived in #2919.

A later reviewed successor must combine:

- the audited package identity accepted from this candidate generation;
- the exact provider/global-writer closure from #2919; and
- the delivery-route/preflight graph rederived on post-#2865 main.

Only that later composition may reconsider a whole executable enforcement
identity.

## Authority

A GREEN candidate still reports:

```text
profile_candidate_accepted=false
enforcement_candidate_identity_accepted=false
provider_closure_composed=false
complete_executable_closure_verified=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

No service/runtime mutation, credentials, buyer/payment records, wallet/signer,
RPC, transaction, Chain-2050/WC, inventory, presale/market,
treasury/liquidity, or funds action occurs.

PROTECT THE CORE.

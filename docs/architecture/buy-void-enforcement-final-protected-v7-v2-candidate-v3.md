# Buy VOID final protected V7/V2 enforcement candidate V3

Marker:

`VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3`.

Status: **source/CI-only candidate; not accepted, deployed, mounted, or launch-authoritative**.

## Purpose

This candidate is the enforcement successor to the V5 receipt-custody census
stacked in #3387.

The V5 census proves that the reviewed deployment-receipt custody repair changes
exactly one of the frozen 49 protected source identities while preserving all
28 economic artifact and 28 economic source inventory digests from frozen
candidate V2.

Candidate V3 converts that census into a complete-closure candidate without
rewriting historical candidate V2 or accepted lock V2.

## Frozen predecessor

V3 preserves:

- frozen candidate V2
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- accepted lock V2
  `589845615654da8b688764377b34296267ac0063`;
- frozen predecessor enforcement set
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`.

Lock V2 remains the historical accepted generation. V3 does not mutate or
reinterpret it.

## Hosted V5 evidence

The candidate binds V5 hosted run `38977527069`:

- Node 22 artifact `12080175556`;
- Node 24 artifact `12079916369`;
- Node 26 artifact `12079507226`;
- V5 census ID
  `voidbefv7c5_5c022759d732fec4f42907c11451f7b90036ac823ef4fc090642eab700417966`;
- V5 JSON SHA-256
  `ba572e907372c1873f5b7f7e994b8b5dce607791ebb5d4974de94a46764c5337`;
- V5 JSON bytes `25799`;
- protected inventory canonical SHA-256
  `6b108cd4a41a46a2f26cad072bfea013707011cd1a13c083f7176e04f041934e`.

Candidate V3 also re-executes the exact V5 proof at its own HEAD and requires
the same protected inventory, economic inventories, one-path delta, 48 unchanged
paths, and preserved economic executable closure.

The current-head V5 census ID may differ because its report binds repository
HEAD/tree. The acceptance-bearing protected and economic inventories may not.

## Custody semantic requalification

The changed protected path is:

`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

at Git blob:

`72dec8920c1a7177d353400c33b71c2de2562aba`.

V3 binds:
- custody proof blob
  `d74aa53bc8ee87581de748d7d0fc57ffa0b13944`;
- operator contract blob
  `32dbc7a69187a09c5cd7fe27ed5481463a157a8f`;
- hosted custody proof run `38975436456`.

It then re-executes the custody proof from current verified source bytes and
requires its exact GREEN/current-enforcement/funds markers.

This prevents V3 from treating byte drift alone as semantic approval.

## Complete-closure transition

V3 may report:

`complete_executable_closure_verified=true`

only because all of the following are true simultaneously:

1. accepted lock V2 binds a previously complete executable closure;
2. V5 proves all frozen economic artifact/source inventories remain exact;
3. V5 proves the protected source delta is exactly one path;
4. that changed path's custody semantics are requalified at the V3 head.

V3 remains a candidate. A separately reviewed lock must accept the exact hosted
V3 candidate identity before any deployment or runtime authority can advance.

## Hosted derivation

Node 22, 24, and 26 each:

1. install from the frozen package lock;
2. typecheck and build;
3. derive V3;
4. re-execute V5 and custody proofs;
5. validate the closed V3 authority surface;
6. upload the candidate JSON.

A cross-node job requires all three JSON files to be byte-identical and performs
a fourth independent build and V3 rederivation.

## Authority

Even when GREEN:

```text
complete_executable_closure_verified=true
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

No Precision mutation, deployment/runtime/service action, RPC, credentials,
private keys, wallets/signers, transaction construction/signing/broadcast,
payment acceptance, presale/WC activation, treasury/liquidity action, or funds
movement occurs.

**PROTECT THE CORE.**

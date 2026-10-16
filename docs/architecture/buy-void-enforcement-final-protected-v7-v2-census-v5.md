# Buy VOID final protected V7/V2 enforcement census V5

Marker:

`VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5`.

Status: **source/CI-only census successor; no candidate or deployment authority**.

## Purpose

This V5 census is the current-main successor required by the reviewed V7
deployment-receipt custody repair in #3386.

The accepted/frozen V2 enforcement candidate tracks 49 source paths. #3386
changes one of those paths:

`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

from Git blob:

`3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`

to the reviewed custody generation:

`72dec8920c1a7177d353400c33b71c2de2562aba`.

The historical candidate, lock, and V4 census must refuse that drift. V5 records
the new source generation rather than weakening those historical checks.

## Exact custody parent

The census requires #3386's exact reviewed parent:

`5ebba1f2b301d1e12d4dff95ae4f3ce22bb82c33`

over canonical base:

`adc5a87d0200aa354b03d9910cbfc1cb2d59bb38`.

That parent must differ from the base by exactly these three reviewed custody
paths:

- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
  -> `72dec8920c1a7177d353400c33b71c2de2562aba`;
- `scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
  -> `d74aa53bc8ee87581de748d7d0fc57ffa0b13944`;
- `docs/operators/buy-void-source-finality-v7-deployment-receipt-install-v1.md`
  -> `32dbc7a69187a09c5cd7fe27ed5481463a157a8f`.

All three must remain byte-identical at the census head.

## Frozen predecessor

V5 preserves, without rewriting:

- frozen enforcement candidate V2
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- accepted enforcement lock V2
  `589845615654da8b688764377b34296267ac0063`;
- frozen V4 census proof
  `f0e1334da67309c1aeb98a2fa19e5ff77424955f`.

The predecessor candidate's accepted protected path set remains the exact
49-path universe for this census.

## Required successor delta

The new protected inventory must have:

```text
protected_tracked_source_count=49
protected_generation_delta_count=1
unchanged_protected_path_count=48
protected_generation_delta_exact=true
```

The sole delta is the deployment-receipt installer blob above, with mode
`100644`. Any other protected path or mode drift fails closed.

## Executable-closure preservation

The custody repair does not change `src/economic`, package manifests, or
TypeScript build configuration.

Hosted V5 derivation therefore rebuilds the repository and recomputes all 28
economic artifact identities and all 28 corresponding economic source
identities. It requires exact equality with all four frozen V2 inventory
digests:

- hosted JSON artifact inventory;
- hosted JSON source inventory;
- canonical artifact inventory;
- canonical source inventory.

This demonstrates that the reviewed custody repair advances protected source
identity while preserving the previously reviewed economic executable closure.

It does **not** itself re-accept the enforcement candidate. A separate successor
candidate must consume the hosted V5 census before any new lock can be created.

## Hosted derivation

Node 22, 24, and 26 each:

1. install the exact audited package lock;
2. typecheck and build;
3. execute the V5 census proof;
4. validate the one-path protected delta and all authority flags;
5. upload the exact census JSON.

A cross-node job requires the three census JSON files to be byte-identical.

## Authority

V5 is census evidence only:

```text
census_only=true
complete_executable_closure_verified=false
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

No Precision mutation, deployment, runtime/service change, RPC contact,
credential/key/wallet/signer access, transaction construction/signing/broadcast,
payment acceptance, presale/WC activation, treasury/liquidity action, or funds
movement occurs.

**PROTECT THE CORE.**

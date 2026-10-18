# Buy VOID repaired V7/V2 current-generation dispatch V2

Marker: `VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V2`.

Status: **source/test/CI verification only; no runtime or economic activation authority**.

## Purpose

V1 correctly separated the frozen accepted V2 enforcement candidate from current-generation integration, but its verification retained historical/restack commit dependencies. Several required commit objects are not ancestors of the current release chain, so a clean future exact-head clone could lose them when temporary refs disappear.

V2 removes that Git-object retention dependency. It proves the current generation from committed accepted evidence and the current tree only.

Base: #3491 exact repaired head `d3e7404791622541a4567ddd506f27caba60cfea`.

## Self-contained identity boundary

V2 requires the exact current economic subtree:

`src/economic` tree `71c67e62a2b21a98f3f5135ee6aa56e0ef97d262`.

That pins the complete economic source generation, including the three previously classified nonprotected rows:

- `buy_void_public_request_under_launch_lock_v1.ts`;
- `buy_void_request_custody_read_policy_v1.ts`;
- `buy_void_verified_payment_capacity_admission_v1.ts`.

It additionally pins `package.json`, `package-lock.json`, and `tsconfig.build.json`.

No historical commit object is required.

## Exact generation versus downstream consumers

The semantic evidence anchor for this V2 verifier is exact reviewed head
`296647cdbba6b113be12b2cc808e2e9cabeac5f9`. Its helper script remains byte-frozen at
`35b8b878ba30cfa7567578ab05424d4f827f3220`.

The workflow has two fail-closed modes:

- on the exact #3500 generation (or manual dispatch), it runs the full Node
  22/24/26 build, receipt derivation, and cross-node byte-identity proof;
- on a downstream PR that inherits this workflow, it does **not** reinterpret
  the downstream PR as a new #3500 candidate. Instead it requires the accepted
  V2 evidence head to be an ancestor, the exact helper/document identities and
  current economic/package generation to remain pinned, and the worktree to
  stay clean.

This prevents a downstream composition from producing a false exact-scope red
while still refusing source/economic drift. Downstream gates remain responsible
for their own additional source/proof paths.

## Frozen accepted enforcement

V2 preserves the exact accepted candidate, lock, enforcement set, and 49-row protected inventory. Every protected row is verified directly against current HEAD blob and mode. The frozen candidate is never rederived on the current head.

## Current build reproduction

After normal `npm ci`, typecheck, and build, V2 rebuilds the same 28-source and 28-artifact inventories and requires both the hosted JSON-order hashes and canonical inventory hashes embedded in the accepted candidate.

## Provider closure

The exact committed provider evidence is byte/hash pinned. V2 checks the accepted provider closure and semantic digests, the exact 12 provider source blobs, exact package/build manifests, and exact bytes/SHA-256/Git-blob identity for the accepted provider runtime artifacts.

This replaces ancestry to divergent historical commits with direct current-source/current-build identity.

## Deliberate authority boundary

Success means only that the current source/build generation reproduces the accepted frozen enforcement and provider identities without dead-history dependence.

Still false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
source_freeze_accepted=false
customer_payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
signing=false
transaction=false
treasury_liquidity_action=false
funds_movement=false
```

No host, wallet, signer, RPC, payment, transaction or funds action occurs.

**PROTECT THE CORE.**

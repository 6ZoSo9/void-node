# Buy VOID source-finality compiled artifact attestation v1

## Purpose

This source-only lane closes the next provenance boundary after the reviewed-source V4 stack in #1474: deterministically identify and lock the exact JavaScript artifacts emitted by the repository production build for the reviewed source-finality runtime dependency closure.

It does **not** claim that any deployed or executing runtime is using those bytes.

## Reviewed source generation

The attestation is bound to exact #1474 source-stack head:

`628f718154e888bde2eb7d1389bce2bcd9461d66`

The lane must remain pathwise unchanged from that generation for:

- `src/**`;
- `package.json`;
- `package-lock.json`;
- `tsconfig.build.json`;
- `scripts/copy_void_runtime_js_v1.mjs`; and
- `scripts/retire_saveblock_periodic_rewriters_v1.mjs`.

The reviewed build inputs are additionally bound to exact Git blob identities:

- `package.json`: `f1887071e7cea9769fed4cf5090812bb4b782a0c`;
- `package-lock.json`: `b57e9018e9aee19340b4fe43d2282208116ec2f8`;
- `tsconfig.build.json`: `d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb`.

The lockfile resolves TypeScript exactly to `5.9.3`.

## Build boundary

The production build command remains exactly:

`npm run build`

which resolves to:

`tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs && node scripts/retire_saveblock_periodic_rewriters_v1.mjs`

The proof runs only after that command succeeds from an `npm ci --ignore-scripts` locked install.

## Closed compiled runtime dependency set

The V4 source-finality entry artifact has a closed relative-runtime-import graph containing exactly six emitted JavaScript files:

1. `dist/economic/buy_void_source_finality_generation_provenance_v4.js`
2. `dist/economic/buy_void_source_finality_authenticated_composition_v3.js`
3. `dist/economic/buy_void_source_finality_authority_v2.js`
4. `dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js`
5. `dist/economic/buy_void_payment_rpc_observer_v1.js`
6. `dist/economic/buy_void_verified_payment_v2.js`

The proof rejects a relative runtime import that escapes that exact set and rejects an expected member that is not reachable from the V4 entry artifact.

## Two-generation acceptance process

### Generation 1 — independent derivation

Node 22, 24 and 26 independently built the exact reviewed source stack and produced byte-identical values for all six artifacts. Their canonical aggregate artifact-set SHA-256 is:

`d59a7ef8e8fa16e432e1ddd157a3dfebab7aa148e04842ccafe4b1720454a0ab`

The derivation generation remained non-accepting and reported:

```text
compiled_artifact_generation_verified=false
deployed_artifact_generation_verified=false
```

### Generation 2 — locked attestation

The agreed identities are committed in:

`docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v1.json`

The proof now recomputes the closed artifact set from a fresh production build and requires byte-for-byte equality with the canonical committed manifest, including metadata, artifact paths, byte lengths, six SHA-256 identities, aggregate SHA-256, source-stack identity, compiler/build inputs, and the Node-major derivation set `[22, 24, 26]`.

Any manifest drift or compiled-byte drift fails closed. Only a fresh exact-head Node 22/24/26 matrix plus proportionate broader CI can establish repository-level compiled-artifact reproducibility for this locked generation.

A successful locked proof reports:

```text
compiled_artifact_generation_verified=true
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
```

## Truth boundary after the locked generation

A successful locked attestation may establish only repository build reproducibility for this exact reviewed source-finality compiled closure. It does not convert that result into a deployment claim.

The later runtime/deployment gate must independently verify that the exact bytes about to execute equal the reviewed compiled-artifact attestation before activation.

Therefore this lane does not authorize or claim:

- deployed artifact identity;
- current running-process identity;
- runtime route mounting;
- live Base/Ethereum RPC;
- Chain-2050 mutation;
- inventory reservation/funding;
- wallet/signer access;
- transaction construction/signing/broadcast;
- public presale activation; or
- money movement.

## Lifecycle state

Keep Draft. The locked manifest and exact-enforcement proof still require fresh exact-head Node 22/24/26 and broader CI before independent review. No Ready transition, merge, deployment, runtime activation, or presale activation is authorized by this artifact lane alone.

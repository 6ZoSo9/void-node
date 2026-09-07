# Buy VOID source-finality compiled artifact attestation v1

## Purpose

This source-only lane closes the next provenance boundary after the reviewed-source V4 stack in #1474: deterministically identify the exact JavaScript artifacts emitted by the repository production build for the reviewed source-finality runtime dependency closure.

It does **not** claim that any deployed or executing runtime is using those bytes.

## Reviewed source generation

The derivation is bound to exact #1474 source-stack head:

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

The V4 source-finality entry artifact is expected to have a closed relative-runtime-import graph containing exactly six emitted JavaScript files:

1. `dist/economic/buy_void_source_finality_generation_provenance_v4.js`
2. `dist/economic/buy_void_source_finality_authenticated_composition_v3.js`
3. `dist/economic/buy_void_source_finality_authority_v2.js`
4. `dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js`
5. `dist/economic/buy_void_payment_rpc_observer_v1.js`
6. `dist/economic/buy_void_verified_payment_v2.js`

The derivation proof rejects a relative runtime import that escapes that exact set and rejects an expected member that is not reachable from the V4 entry artifact.

## Two-generation acceptance process

The first CI generation is intentionally **derivation-only**. On Node 22, 24 and 26 it builds the repository and reports the six exact byte lengths/SHA-256 identities plus one canonical aggregate artifact-set SHA-256.

That first generation is not acceptance evidence and must report:

```text
compiled_artifact_generation_verified=false
deployed_artifact_generation_verified=false
```

Only after all three Node-major derivations are byte-identical may those identities be committed into a closed attestation manifest and the proof changed to require exact equality. The subsequent exact-head CI generation is the acceptance surface.

## Truth boundary after the locked generation

A successful locked attestation may establish only repository build reproducibility for this exact reviewed source-finality compiled closure. It must not convert that result into a deployment claim.

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

## Initial lifecycle state

Keep Draft. The derivation generation exists only to obtain independently repeated Node 22/24/26 build identities. No Ready or merge claim is valid until a later exact head contains the locked manifest, exact-enforcement proof, terminal green dedicated matrix and proportionate broader CI.

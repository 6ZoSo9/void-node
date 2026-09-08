# Buy VOID source-finality compiled artifact attestation v1

## Purpose

This source-only lane closes the next provenance boundary after the reviewed-source V4 stack in #1474: deterministically identify and lock the exact JavaScript artifacts emitted by the repository production build for the reviewed source-finality runtime dependency closure.

It does **not** claim that any deployed or executing runtime is using those bytes.

## Reviewed source generation

The current attestation derivation is bound to the accepted exact #1474 source-stack head:

`9202f3ce11664873f2316b08cbdbe2b98fd77fb4`

#1474 merged to `main` as `83a6f5c2d6737b397898f1a6c5ceb0ec9ac0498f`. The #1475 branch is synchronized with that merged generation before deriving new compiled identities.

The lane must remain pathwise unchanged from the accepted #1474 source generation for:

- `src/**`;
- `package.json`;
- `package-lock.json`;
- `tsconfig.build.json`;
- `scripts/copy_void_runtime_js_v1.mjs`; and
- `scripts/retire_saveblock_periodic_rewriters_v1.mjs`.

The workflow triggers on those same bound inputs as well as the attestation proof, manifest, documentation, and workflow itself, so later input drift cannot silently bypass the focused gate.

The reviewed build inputs remain bound to exact Git blob identities:

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

## Superseded compiled generation

The previous locked generation was bound to #1474 source-stack head `f0fd6fb9afff43986d7f0b87e9aac3750d4e4f34` and reported aggregate compiled artifact-set SHA-256:

`acf85d2f928ac4e303428df5c5e3f5aa9b4bbdfa0e367c6c9088514dce7206b8`

That value is historical only and is **not accepted as current evidence** because V4/V3/V2 source bytes changed before #1474 reached its accepted head.

## Current two-generation acceptance process

### Generation 1 — independent derivation

The proof is now bound to accepted #1474 head `9202f3ce11664873f2316b08cbdbe2b98fd77fb4`, while the committed JSON manifest is deliberately left on the superseded generation.

Node 22, 24 and 26 must independently build the current source stack. Each job is expected to fail specifically with `compiled_artifact_attestation_manifest_mismatch` after emitting `candidate_manifest_json` and uploading its derivation log. All six artifact byte lengths, six SHA-256 identities, and the aggregate artifact-set SHA-256 must agree across all three Node majors before any new manifest is committed.

This derivation pipeline runs under explicit `set -euo pipefail`, so a nonzero proof exit cannot be masked by the evidence `tee` stage.

During this derivation generation:

```text
compiled_artifact_generation_verified=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
```

### Generation 2 — locked attestation

Only after all three derivations agree may the current identities replace the superseded manifest in:

`docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v1.json`

The proof must then recompute the closed artifact set from fresh production builds and require byte-for-byte equality with the committed manifest, including metadata, artifact paths, byte lengths, six SHA-256 identities, aggregate SHA-256, source-stack identity, compiler/build inputs, and Node-major derivation set `[22, 24, 26]`.

Any manifest drift or compiled-byte drift fails closed. Acceptance requires a fresh exact-head Node 22/24/26 locked matrix plus repository CI on that same SHA.

A successful locked proof may report:

```text
compiled_artifact_generation_verified=true
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
```

## Truth boundary

Repository-level compiled reproducibility does not establish deployed or executing runtime identity. A later deployment/runtime gate must independently prove that the exact bytes about to execute equal the reviewed compiled-artifact attestation before activation.

This lane does not authorize or claim deployment, runtime route mounting, live Base/Ethereum RPC, Chain-2050 mutation, inventory reservation/funding, wallet/signer access, transaction construction/signing/broadcast, public presale activation, or money movement.

## Lifecycle state

Keep Draft.

Current state:

`CURRENT_MAIN_SYNCHRONIZED / ACCEPTED_V4_SOURCE_BOUND / MANIFEST_INTENTIONALLY_STALE / NODE_22_24_26_REDERIVATION_PENDING / PIPEFAIL_FAIL_CLOSED / NO_MERGE_OR_RUNTIME_AUTHORIZATION`

# Buy VOID enforcement artifact attestation v2

Marker: `VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2`

Status: **source/build/package provenance successor; production authority HOLD**.

## Purpose

V2 is the current enforcement-closure successor required by the reviewed
verified-payment V2 log-index repair and source-finality provenance V5.

It does not rewrite or reinterpret enforcement V1. The historical V1 manifest
remains immutable predecessor evidence:

- manifest:
  `docs/architecture/buy-void-enforcement-artifact-attestation-v1.json`;
- Git blob:
  `b9d8a57f8a67f2e9180b15a608c178bc95bf84b5`;
- enforcement artifact set:
  `f21b4c486ee686f53cb03e858bdff01d4b56be205c819322813538d5273062fb`.

V2 reuses the same closed enforcement derivation rather than introducing a
second import-graph implementation.

## Reviewed source and compiled lineage

V2 requires the exact reviewed source-finality V5 generation and compiled
artifact V3 generation:

- reviewed source-files SHA-256:
  `554eecb2254ecfeb7495314b019247f4a3a7b317a6431e54b78fe95cb675d14e`;
- compiled V3 manifest Git blob:
  `d6e97784c5d8be93713e733628c7d1ef746bb5c7`;
- compiled V3 generation:
  `0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add`.

The current V3 manifest is locked to the exact rerolled verifier/build identity.
Fresh exact-head Node 22/24/26 derivations must reproduce those committed bytes.

## Exact predecessor delta

The enforcement V1 and V2 closures contain the same number of runtime modules.
V2 permits exactly this artifact transition:

Removed:

- `dist/economic/buy_void_source_finality_generation_provenance_v4.js`.

Added:

- `dist/economic/buy_void_source_finality_generation_provenance_v5.js`.

Changed in place:

- `dist/economic/buy_void_source_finality_execution_preflight_v1.js`;
- `dist/economic/buy_void_verified_payment_v2.js`.

Exactly twenty common enforcement artifacts must remain byte-identical to V1.

The bound source/build input set permits the corresponding source transition
only:

Removed:

- `src/economic/buy_void_source_finality_generation_provenance_v4.ts`.

Added:

- `src/economic/buy_void_source_finality_generation_provenance_v5.ts`.

Changed in place:

- `src/economic/buy_void_source_finality_execution_preflight_v1.ts`;
- `src/economic/buy_void_verified_payment_v2.ts`.

Exactly twenty-seven common inputs must remain byte-identical to V1. Package
inputs, compiler inputs, Dockerfile, TypeScript configuration, runtime-copy
helpers and every unrelated enforcement source remain unchanged.

## Current derived closure

The reviewed current enforcement raw candidate was independently derived
byte-identically on Node 22, 24 and 26:

- candidate JSON bytes: 22,575;
- candidate JSON SHA-256:
  `a839811d65a94c2428a50a3c36308623fa3b100d00d2a068e9a26f0c3bd01ea4`;
- enforcement artifact set SHA-256:
  `5b35c2c4e1c9c7812ddbcb2f35ea5f309771e5343230331780b81323eb11cc30`.

The V2 manifest is accepted only when a fresh derivation reproduces the exact
committed bytes.

## Package and image proof

The current enforcement workflow must:

1. build on Node 22, 24 and 26;
2. derive one identical V2 manifest;
3. verify the committed V2 manifest;
4. rerun the compiled enforcement command gate and adversarial falsifiers;
5. verify compiled source-finality generation V3;
6. build a production Docker image without starting it;
7. extract the enforcement closure from a stopped container;
8. reverify V2 against the extracted bytes; and
9. verify the saved image/config/layer identity against the V2 artifact set.

Historical V1 bytes remain predecessor evidence, not current package authority.

## Authority boundary

V2 proves source/build/package identity only. It does not authorize or perform:

- runtime route activation or service restart;
- production live RPC;
- wallet, signer, credential or private-key access;
- transaction construction, signing or broadcast;
- Chain-2050 mutation;
- inventory funding or transfer;
- presale or market activation;
- treasury or liquidity action; or
- funds movement.

`production_source_finality_authority_ready=false` and
`deployed_artifact_generation_verified=false` remain mandatory.

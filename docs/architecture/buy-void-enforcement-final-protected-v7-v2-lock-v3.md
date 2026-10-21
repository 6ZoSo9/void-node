# Buy VOID protected V7/V2 acceptance lock V3

Status: **source/CI-only acceptance lock; no deployment/runtime/economic authority**.

## Exact accepted candidate generation

This V3 lock is stacked on immutable reviewed candidate head:

`a93016c2e1b0656e9abe8a7607bc35c6cf94eb37`

It accepts exactly:
- candidate path `ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json`;
- candidate Git blob `79998af4763b6afca84ffe4e8d14d9a6ff535dfd`;
- candidate bytes `17392`;
- candidate SHA-256 `df3b5b74e0d1cd0f3198d8f0a5190d392518480804155ad848cd43b6eae6cbf6`;
- candidate enforcement-set SHA-256 `95a11602e5f2639d33b378293b92863ea7f9f37020ad18dec49d3d4ac6289fd4`;
- derivation proof Git blob `8ea7786299422f7fc3fbfd7474b5e92d869e92c2`.

The candidate parent remains unchanged. This lock successor does **not** modify or rerun the candidate proof against a widened HEAD; instead it content-binds the reviewed parent generation and independently validates its exact bytes, reviewed source transition, audited package-runtime identity, dependency-provider closure, V7 executable-delta generation, and negative-authority contract.

## Real hosted evidence

Portable candidate evidence is bound to exact workflow run `39541480682`:
- Node 22 artifact `12319906482`;
- Node 24 artifact `12320135827`;
- Node 26 artifact `12319778088`;
- portable cross-node equality job `119031386124`.

All three portable jobs derive the same candidate from reachable-history-only clones. The V3 lock workflow re-runs those parent candidate jobs against the exact candidate head before its own lock proof.

## Protected successor

V1/V2 candidate and lock generations remain immutable historical evidence.

V3 accepts exactly one reviewed protected source transition:
- `src/index.ts`
- predecessor blob `123ec1792a027f93d4c9030749a0e7e136a75a44`
- current blob `7df1f21c730b554c414c88c550a4475234485370`.

The frozen predecessor protected inventory SHA-256 remains
`224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

The reviewed current 49-row inventory SHA-256 is
`c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb`.

## Current lock identities

- lock Git blob: `245ce93ebfb53478211fab765489e88d8fa23c4a`;
- lock proof Git blob: `12d94e2d89fea2a383d2279ec2b8e9b7802c7351`.

## Authority

The lock sets `candidate_enforcement_identity_accepted=true` for this exact source generation only.

All remain false:
- deployed artifact generation verified;
- runtime mount authority;
- production source-finality authority;
- public presale activation;
- funds movement.

No deployment receipt plan/apply, service mutation, credential/signer access, transaction, payment acceptance, treasury/liquidity action, or funds movement is performed by this source PR.

Keep Draft pending exact-head CI and review.

PROTECT THE CORE.

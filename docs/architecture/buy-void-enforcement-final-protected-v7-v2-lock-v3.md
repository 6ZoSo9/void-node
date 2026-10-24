# Buy VOID protected V7/V2 acceptance lock V3

Status: **source/CI-only acceptance lock; no deployment/runtime/economic authority**.

## Exact accepted candidate generation

This V3 lock is stacked on immutable reviewed candidate head:

`f3d06b71ad9f6b6c6c7b26ba6001e07e55ae39f2`

It accepts exactly:
- candidate path `ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json`;
- candidate Git blob `40c7d21e0f22bc2ffe079f80360af342f4d8a6aa`;
- candidate bytes `17392`;
- candidate SHA-256 `7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96`;
- candidate enforcement-set SHA-256 `4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223`;
- derivation proof Git blob `5cd2c9cb4f7ac4f4a71a697d04aa23c3ee9d6705`.

The candidate parent remains unchanged. This lock successor does **not** modify or rerun the candidate proof against a widened HEAD; instead it content-binds the reviewed parent generation and independently validates its exact bytes, reviewed source transition, audited package-runtime identity, dependency-provider closure, V7 executable-delta generation, and negative-authority contract.

## Real hosted evidence

Portable candidate evidence is bound to exact workflow run `40044451207`:
- Node 22 artifact `12540673158`;
- Node 24 artifact `12540507407`;
- Node 26 artifact `12540897955`;
- portable cross-node equality job `120724698695`.

All three portable jobs derive the same candidate from reachable-history-only clones. The V3 lock workflow re-runs those parent candidate jobs against the exact candidate head before its own lock proof.

## Protected successor

V1/V2 candidate and lock generations remain immutable historical evidence.

V3 accepts exactly one reviewed protected source transition:
- `src/index.ts`
- predecessor blob `123ec1792a027f93d4c9030749a0e7e136a75a44`
- current blob `a09661797aa4295371c036be36d82995e5233269`.

The frozen predecessor protected inventory SHA-256 remains
`224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

The reviewed current 49-row inventory SHA-256 is
`65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589`.

## Current lock identities

- lock Git blob: `f1b9d661eb3363e9bf18dbeb3610c659a54219bb`;
- lock proof Git blob: `126fad9b17e4958742ccd508fe04c52ef84599b5`.

## Defensive proof-input boundary — October 21, 2026

The acceptance proof reads candidate, lock, workflow and dependency bytes through one no-follow, nonblocking descriptor. Each read is bounded to `max + 1`, requires the opened descriptor to match the pre-open pathname generation, compares pre/post `fstat` on that same descriptor, and revalidates the visible pathname generation. Inert temporary-directory regressions reject regular-file replacement, pre-existing symlinks, lstat-to-open symlink swaps, regular-to-FIFO swaps without blocking, and oversized input.

This hardens source-proof integrity only. It does not alter the accepted lock JSON/candidate bytes or grant deployment/runtime/economic authority.

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

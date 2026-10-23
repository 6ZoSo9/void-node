# Buy VOID protected V7/V2 acceptance lock V3

Status: **source/CI-only acceptance lock; no deployment/runtime/economic authority**.

## Exact accepted candidate generation

This V3 lock is stacked on immutable reviewed candidate head:

`c9d516763cf6d6674d0ede57faf9452d4802d2f1`

It accepts exactly:
- candidate path `ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json`;
- candidate Git blob `5301c32f53c2a82435152e38b36486507a73f906`;
- candidate bytes `17392`;
- candidate SHA-256 `eb2be386ecf374bc75d6c10e4d5cfa3ea5fa309acbef5612f74991c6ba311aab`;
- candidate enforcement-set SHA-256 `2bfc8455c09e8cbbaa56ac580ccc5f193b54f95c3e4bec1e2274a068303236ec`;
- derivation proof Git blob `96ae15c0a76d4cc463ea64688fa2c5fd119b09fc`.

The candidate parent remains unchanged. This lock successor does **not** modify or rerun the candidate proof against a widened HEAD; instead it content-binds the reviewed parent generation and independently validates its exact bytes, reviewed source transition, audited package-runtime identity, dependency-provider closure, V7 executable-delta generation, and negative-authority contract.

## Real hosted evidence

Portable candidate evidence is bound to exact workflow run `39979328838`:
- Node 22 artifact `12513585992`;
- Node 24 artifact `12513785788`;
- Node 26 artifact `12512398541`;
- portable cross-node equality job `120506442218`.

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

- lock Git blob: `e530390e505d447ca0ad9e2a098ec6a819ae3e6c`;
- lock proof Git blob: `a3b2aad30e22ead3cc73bbd0def3d1fb4f934d01`.

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

# Buy VOID protected V7/V2 lock V4

Status: **source/CI-only acceptance of one exact reviewed candidate generation**.

## Accepted candidate

- candidate head: `65e390d6d3da1f0aef7181c2085b9c7d44967126` (#3665);
- candidate path: `ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json`;
- candidate blob: `b8341906d9563739a50dac98ea184a1d93267531`;
- candidate bytes: `18214`;
- candidate SHA-256: `7408f190f01113ca8be42f388acbe7fad083ec11100fa9bb31017e635cf53a9f`;
- candidate enforcement-set SHA-256: `f28b445fe5f1e632d1265ead825ecf9338644a3ae2704fde83ba1cedaf6be695`;
- derivation proof blob: `781c99c145ac267f1a177c542f095a7f7bd3063f`.

Hosted candidate evidence:

- workflow run `39985941315`;
- Node 22 artifact `12516106713`;
- Node 24 artifact `12515888749`;
- Node 26 artifact `12515668276`;
- cross-node job `120529688330`.

The three derivations and cross-node equality are terminal SUCCESS, and exact-head candidate review completed with no findings.

## Historical preservation

Historical V3 remains immutable:

- candidate V3 blob `5301c32f53c2a82435152e38b36486507a73f906`;
- accepted lock V3 blob `e530390e505d447ca0ad9e2a098ec6a819ae3e6c`.

V4 preserves the 49-row inventory SHA-256 `686745113e5e5223a357c053a41496dc8ded12698c31967d541efea7bfe469f1` and the reviewed single protected drift to the hardened deployment-receipt tool.

## Lock identity

- lock blob: `416202f5a7ee4c55950d5db9d13a718c721fc801`;
- lock SHA-256: `95a16e215ae223c663f7675537ff6037ec2c85491c4aa9dd945e1439684d01b9`;
- proof blob: `2a3bab07d2f74e39d19f0e22b1f64ac69a4873a3`.

The lock proof reads candidate/lock dependencies through bounded `O_NOFOLLOW|O_NONBLOCK` descriptors with pre/open/post generation revalidation. Its inert fixture exercises same-size regular replacement, lstat-to-open symlink substitution, lstat-to-open FIFO substitution without blocking, and oversize rejection.

The lock sets `candidate_enforcement_identity_accepted=true` for this exact V4 candidate only.

It does **not** establish deployed artifact generation, runtime mount, production source-finality, public presale activation or funds movement. Those remain false and require later, separate evidence/authority.

## Scope

This successor is exactly four ADD-only paths: lock JSON, lock proof, this document, and its dedicated workflow.

No merge, deployment/apply, service mutation, credential/signing, transaction/payment acceptance, treasury/liquidity action or funds movement is authorized.

PROTECT THE CORE.

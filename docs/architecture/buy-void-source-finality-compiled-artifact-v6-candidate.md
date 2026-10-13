# Buy VOID source-finality compiled artifact V6 dependency successor candidate

## Purpose

This stacked Draft qualifies the audited dependency generation from parent Draft #2865 without rewriting frozen source-finality history.

The current package generation changes only package metadata and tooling dependencies. Parent exact-head equivalence evidence proved on Node 22/24/26 that the six reviewed source-finality compiled artifacts are byte-identical across the historical and audited package generations. All three derivation receipts are byte-identical with SHA-256:

`3e3714b3b5674d9dbf1356f523de9e969d50bfb1065a719435733f25336c6b56`.

## History boundary

Locked V4 remains the accepted compiled-artifact predecessor.

V5 remains an **unaccepted derive-only candidate**. Its exact script Git blob is:

`d63a2a2db2b4a80b200f065f6dbf973db31f3f2e`

and its historical baseline candidate generation is:

`18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c`.

V6 does not repin V5. It records V5 as historical unaccepted evidence and separately binds the audited package generation.

## Audited package generation

- package.json Git blob: `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`
- package-lock.json Git blob: `15b5c82ea36f13079a2f9e8863722f654eb3f201`
- reviewed V2 package profile Git blob: `a09f47596fdf66afef64e82200f23966664a7d2c`
- reviewed V2 profile ID: `voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451`
- unchanged installed ethers package aggregate: `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`

The V6 generation digest includes these package/profile identities in addition to the reviewed source generation and compiled artifact records.

## Exact artifact boundary

The candidate requires the exact six artifact byte records proven by the parent equivalence lane. Any artifact-byte change fails closed.

The candidate is derive-only and always keeps:
- `compiled_artifact_generation_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`.

A future locked V6 manifest, if justified, is a separate reviewed gate.

## Authority boundary

Source/build evidence only. No deployment, service/runtime mutation, RPC mutation, credential/key/wallet/signer access, transaction construction/signing/broadcast, payment acceptance, validator/WC mutation, presale/market activation, inventory, treasury/liquidity, or funds movement.

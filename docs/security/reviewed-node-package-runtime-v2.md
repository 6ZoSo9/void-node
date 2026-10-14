# Reviewed Node package runtime — dependency successor V2

This source-only successor accompanies the audited dependency generation in issue #2839.

- The reviewed runtime implementation remains `tools/void-reviewed-node-package-runtime-v1.mjs` and is byte-frozen.
- Historical `ops/security/reviewed-node-package-runtime-ethers-v1.json` remains byte-frozen and must refuse the new package metadata.
- `ops/security/reviewed-node-package-runtime-ethers-v2.json` is the exact profile independently rederived by the existing verifier on Node 22, 24, and 26 from the dependency candidate.
- The `ethers` installed-package aggregate is unchanged; only repository package metadata moved to the audited dependency generation.
- V2 does not authorize npm installation on an operator host, runtime/service mutation, network isolation claims, credentials, wallets/signers, transactions, market/presale activation, or funds movement.

Current reviewed metadata:

- `package.json` Git blob: `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`
- `package-lock.json` Git blob: `15b5c82ea36f13079a2f9e8863722f654eb3f201`
- profile ID: `voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451`
- installed package aggregate: `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`

This closes only the reviewed-package-profile prerequisite. Current-positive WC/VOID and Buy VOID consumers must advance explicitly and must not repin historical V1 evidence.

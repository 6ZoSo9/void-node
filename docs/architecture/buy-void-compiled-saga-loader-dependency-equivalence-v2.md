# Buy VOID compiled saga loader — dependency equivalence V2

This additive source-only successor qualifies the audited dependency generation from issue #2839 without rewriting the frozen V1 inert-loader proof.

## Historical and audited generations

- historical dependency baseline: `0ac56eba7ec488fec94cfce89698a7febfedc0b6`;
- historical package blobs: `package.json=f28c3e9446c7623ef203da36a9642d046e5f34ee`, `package-lock.json=b2671f0149f522b2489247016df0a5ec4bb72b8b`;
- audited package blobs: `package.json=14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`, `package-lock.json=15b5c82ea36f13079a2f9e8863722f654eb3f201`;
- frozen V1 inert-loader proof blob: `62476d1d22d6b32ff14e7327ecaaa0f858033faa`.

All reviewed composition source, saga source, Dockerfile, TypeScript build configuration and build/helper source identities are required to be byte-identical between the two generations.

## Qualification contract

On Node 22, 24 and 26 the workflow installs both exact locks with package lifecycle scripts disabled and builds both trees. It requires:

1. the frozen V1 proof to derive successfully on the historical dependency generation;
2. that same frozen V1 proof to fail closed on the audited generation at its old package-lock identity boundary;
3. both builds to preserve the V1 inert-loader self-test and never import the real saga;
4. the freshly emitted `dist/economic/buy_void_erc20_execution_composition_v1.js` bytes to be exactly identical across the two dependency generations;
5. the compiled importer bytes/hash to match the historical V1 positive receipt; and
6. all three supported Node majors to emit byte-identical V2 receipts.

This proves dependency-generation build equivalence for this one compiled importer. It does **not** accept the frozen V1 proof on new metadata and does not establish stopped-image deployment, source-finality authority, enforcement-V5 acceptance, payment/presale activation, wallet/signer authority, or funds movement.

Frozen V1 evidence remains immutable. Unknown dependency or source/build generations HOLD.

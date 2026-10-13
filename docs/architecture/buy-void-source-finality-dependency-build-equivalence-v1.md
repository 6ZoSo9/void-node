# Buy VOID source-finality dependency build equivalence V1

This additive source-only gate qualifies the audited dependency generation from
issue #2839 without rewriting historical compiled-artifact evidence.

It compares two exact repository generations side by side:

- historical dependency baseline: `59b8fa9d3fa3b238655839f9cfc573ebb91752dd`;
- audited package generation: the exact pull-request head containing
  `package.json` Git blob `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`
  and `package-lock.json` Git blob
  `15b5c82ea36f13079a2f9e8863722f654eb3f201`.

The historical V5 compiled-artifact candidate proof remains byte-frozen. It must
derive successfully on the historical package generation and must refuse the
audited package generation at its package-input identity boundary.

After installing both exact lockfiles with lifecycle scripts disabled and
building both trees on Node 22, 24 and 26, this gate requires all six current
source-finality compiled artifacts to be byte-identical. The six reviewed source
files and build scripts must also be unchanged between the two repository
generations.

The committed reviewed package-runtime V2 profile remains a separate prerequisite
and preserves the exact installed `ethers` package inventory while advancing
only package/lock metadata identity.

This proof does **not** mark the V5 compiled candidate accepted, deployed, mounted
or production-authoritative. It grants no runtime/service, wallet/signer,
transaction/payment, presale/WC/VOID activation, treasury/liquidity or funds
authority. Current-positive downstream consumers still require explicit
successor treatment; frozen V1/V4/V5 evidence must not be bulk-repinned.

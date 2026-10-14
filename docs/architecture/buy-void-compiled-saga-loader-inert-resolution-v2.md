# Buy VOID exact compiled saga loader — audited dependency successor V2

Marker: `VOID_BUY_VOID_COMPILED_SAGA_LOADER_INERT_RESOLUTION_V2`.

This source-only successor preserves the frozen V1 proof and its historical
package generation while qualifying the audited dependency generation from
Draft #2865.

## Closed generation split

- Historical package/lock:
  - `package.json=f28c3e9446c7623ef203da36a9642d046e5f34ee`
  - `package-lock.json=b2671f0149f522b2489247016df0a5ec4bb72b8b`
  - continues to run the exact V1 proof.
- Audited package/lock:
  - `package.json=14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`
  - `package-lock.json=15b5c82ea36f13079a2f9e8863722f654eb3f201`
  - requires the frozen V1 proof to refuse the new lock, then runs V2.
- Every unknown dependency generation fails closed.

V2 requires all non-package source/build inputs used by the inert-loader proof
to remain unchanged from reviewed parent
`eeef850affd912a0d1e019bfac2d681b38ea24ed`. It then builds the current tree
and requires the same exact compiled importer:

- path: `dist/economic/buy_void_erc20_execution_composition_v1.js`;
- bytes: `86455`;
- SHA-256: `b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`.

The same AST shape and disposable inert-target execution negatives are retained.
The real fulfillment saga is never imported or executed.

This proves only dependency-generation equivalence for the inert loader. It does
not qualify a stopped image, deployment, source-finality authority, signer,
wallet, payment, WC/VOID activation, validator state, treasury, liquidity, or
funds movement.

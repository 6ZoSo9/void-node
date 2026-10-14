# Buy VOID composed stopped saga package — audited dependency successor V2

Marker: `VOID_BUY_VOID_COMPOSED_STOPPED_SAGA_PACKAGE_CANDIDATE_V2`.

This stacked source-only successor closes one dependency-generation CI gap on
Draft #2865 without changing the frozen V1 stopped-package proof.

## Generation boundary

Historical dependency generation:

- `package.json=f28c3e9446c7623ef203da36a9642d046e5f34ee`
- `package-lock.json=b2671f0149f522b2489247016df0a5ec4bb72b8b`
- continues to execute the exact frozen V1 proof.

Audited #2865 generation:

- `package.json=14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`
- `package-lock.json=15b5c82ea36f13079a2f9e8863722f654eb3f201`
- requires frozen V1 to refuse the changed package source boundary;
- then executes V2.

Every mixed or unknown package/lock generation fails closed.

## V2 source contract

V2 requires the historical reviewed source parent
`eeef850affd912a0d1e019bfac2d681b38ea24ed` to remain an ancestor and proves
that, within the frozen V1 source-bound set, **only** `package.json` and
`package-lock.json` changed.

It separately pins:

- the exact audited package/lock Git blobs;
- the frozen V1 stopped-package proof Git blob;
- the descriptor-relative Linux reader and reviewed Git helper;
- the existing execution-composition source;
- the crash-consistent saga source;
- the Dockerfile final-stage package contract.

The audited build must still emit the same exact compiled saga importer:

- path: `dist/economic/buy_void_erc20_execution_composition_v1.js`;
- bytes: `86455`;
- SHA-256:
  `b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`.

The stopped-image proof requires the reviewed saga source to be present
byte-for-byte, keeps the existing known-positive tool, and requires the
unreviewed broadcaster/custodian tools to remain absent.

## Frozen-history preservation

V2 does not repin or reinterpret V1. On the audited dependency pair it executes
the frozen V1 self-test and requires a deterministic refusal at V1's reviewed
package source boundary. Historical V1 remains the positive proof only for its
original dependency generation.

The existing compiled inert-loader V2 remains the independent proof that the
audited dependency tree emits and executes the same exact importer shape against
a disposable inert target without importing the real saga.

## Authority boundary

The workflow may build a new Docker image only to create a **stopped** container
and copy reviewed files out for inspection. The container must remain in
`created` / non-running state and have no mounts.

This successor does not:

- accept a packaged image generation;
- qualify deployment or runtime mounting;
- import or execute the real fulfillment saga;
- access credentials, keys, wallets or signers;
- read or mutate customer payment/allocation records;
- construct, sign, submit or broadcast transactions;
- mutate Chain-2050, WC, validators, inventory, treasury or liquidity;
- activate Buy VOID, WC/VOID, the presale or any market;
- move funds.

It must not be merged independently of the #2865 audited dependency generation.

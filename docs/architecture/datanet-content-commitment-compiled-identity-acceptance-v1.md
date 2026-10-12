# DataNet Content Commitment Compiled Identity Acceptance v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1`

Status: exact artifact acceptance only. No RPC, deployment, address selection, transaction construction/signing/broadcast, Chain-2050 mutation, validator mutation, service action, wallet access, or funds action.

## Accepted identity

The accepted artifact is:

`ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json`

It was emitted by the successful dual-compiler **push-to-main** run for source commit:

`beb4bd06d66304347080bb0852af1efbb4546128`

with:

- source ref: `main`
- identity ID: `voiddccci1_81d496b90721265d126a12e331432c10ca5403cc650fe634adce92b15c6afed6`
- JSON SHA-256: `17e74d657c0b9a348d5d007e7e66b830faba97b217ea4f7a0d5ba97f9963f6cd`
- JSON bytes: `21089`
- contract source SHA-256: `b1f4d40bf701fa72ff5921646c32d091c65bdee3257098aaabfef8df4d802877`
- creation bytecode SHA-256: `85716cc7d58f49f92a3d09fd2b365ae74e5045514d3ebf7eb12f7787ef18c6df`
- runtime template SHA-256: `6bf8ccf7463f6f42f2b41be19bba7dad96b72cfd7a4b651b244caec6f88946db`
- immutable layout SHA-256: `7546b9f20a800437dbbf39f5dc32b0d0bb2980ae45f785527bc8ea53241ef8cf`

## Immutable layout

Publisher references:

`1070:32`, `1106:32`

Predecessor references:

`454:32`, `518:32`, `816:32`, `876:32`, `1767:32`

A deployment verifier must patch every compiler-derived reference before comparing the reconstructed runtime to observed `eth_getCode`.

## Acceptance boundary

Acceptance proves only that the exact reviewed source has one pinned, reproducible compiler identity.

It does not prove:

- a registry is deployed;
- any contract address is canonical;
- publisher or predecessor bindings;
- predecessor lineage;
- current `isCommitted(objectIdSha256)` state;
- transaction construction/signing/broadcast;
- receipt membership;
- checkpoint membership; or
- Chain-2050 finality.

All such fields remain held.

## Next gate

`exact_chain2050_registry_deployment_and_predecessor_lineage_attestation`

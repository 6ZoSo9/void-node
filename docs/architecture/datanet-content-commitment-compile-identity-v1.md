# DataNet Content Commitment Compiler Identity v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1`

Status: source-only deterministic compiler identity gate. It performs no Chain-2050 RPC, deployment, address selection, transaction construction/signing/broadcast, validator action, service mutation, wallet access, or funds movement.

## Purpose

The Phase-0 canonical preparation intent binds the reviewed Solidity source for `DatanetContentCommitmentRegistryV1`, but exact deployment attestation requires a deterministic compiler identity.

The deployed runtime contains two immutables:

- `publisher`
- `predecessor`

A later deployment verifier must reconstruct the runtime by patching those exact compiler-derived immutable locations, then compare byte-for-byte with `eth_getCode`.

## Compiler profile

The fixed profile is:

```text
solc=0.8.24+commit.e11b9ed9
evmVersion=paris
optimizer.enabled=false
optimizer.runs=200
viaIR=false
metadata.appendCBOR=true
metadata.useLiteralContent=true
metadata.bytecodeHash=ipfs
```

## Independent compiler environments

CI compiles the exact Standard JSON input with:

- native `ethereum/solc:0.8.24`
- `solc-js 0.8.24` / Emscripten

The gate requires distinct environment kinds, implementations, and fingerprints.

Both outputs must match exactly for creation bytecode, deployed-runtime template, ABI, metadata, storage layout, method identifiers, immutable layout, and source maps.

## Immutable layout

The compiler AST maps immutable-reference IDs to exactly:

`publisher`

`predecessor`

Each reference must be a non-overlapping in-bounds 32-byte patch region.

## Deployment identity requirements

A later gate must prove:

- exact contract address and creation transaction;
- constructor `publisher` and `predecessor`;
- runtime reconstructed from the committed template and immutable locations;
- observed `registryVersion() == 1`;
- observed `maxObjectBytes() == 268435456`;
- observed `publisher()` equals constructor binding;
- observed `predecessor()` equals constructor binding;
- predecessor lineage is reviewed;
- a fresh read-only `isCommitted(objectIdSha256)==false` before construction.

## Not accepted yet

A green CI review still records:

`compiled_identity_committed=false`

`deployment_attested=false`

The exact generated identity must be separately captured, reviewed, and committed before it can authorize any deployment/lineage attestation.

No generated identity in CI selects an address or grants mutation authority.

## Next gate

After the exact identity is committed:

`verify_explicit_chain2050_registry_deployment_and_lineage`

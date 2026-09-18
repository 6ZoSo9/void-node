# Buy VOID presale fulfillment compile identity v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1`

Status: source-only deterministic compiler identity gate. It performs no
Chain-2050 RPC, deployment, inventory funding, runtime enablement, signing,
broadcast, or public activation.

## Why this gate exists

The production activation contract now correctly distinguishes a candidate
fulfillment-contract address from proof that the reviewed
`BuyVoidPresaleFulfillmentV1` was actually deployed.

Before a live deployment can be attested, the repo needs one exact compiler
identity for the reviewed Solidity source.

The deployed runtime cannot be represented by one universal hash because the
contract contains three immutables:

- `token`;
- `fulfiller`; and
- `predecessor`.

Solidity patches those values into deployed runtime bytecode at constructor
execution.

The compile identity therefore commits:

1. exact creation bytecode;
2. exact unpatched deployed-runtime template;
3. exact immutable-reference offsets;
4. ABI and method identifiers;
5. compiler metadata/storage layout/source maps; and
6. the deterministic compiler input/profile.

A later deployment attestation can patch the observed constructor bindings into
the committed runtime template and compare the reconstructed runtime with
`eth_getCode`.

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

The profile deliberately pins `paris` even though Solidity 0.8.24 supports
newer EVM targets.

## Independent compiler environments

The focused CI compiles the exact same Standard JSON input twice:

- native `ethereum/solc:0.8.24`; and
- `solc-js 0.8.24` / Emscripten.

The reviewer requires different environment fingerprints, different
environment kinds, and different implementation labels.

Both outputs must match exactly for:

- creation bytecode;
- deployed runtime template;
- ABI;
- metadata;
- storage layout;
- method identifiers;
- immutable reference layout; and
- source maps.

Compiler errors, link references, profile drift, or a Paris-incompatible
`PUSH0` in executable bytecode fail closed.

## Immutable layout

The compiler AST is used to resolve immutable-reference IDs back to exact
source variable names.

The identity is accepted only when the deployed-runtime immutable references
contain exactly:

```text
token
fulfiller
predecessor
```

Each reference must be an in-bounds 32-byte patch region and reference regions
may not overlap.

This means later deployment attestation does not guess which compiler offset
belongs to which constructor binding.

## Artifact identities

The identity records both SHA-256 and Ethereum Keccak-256 for:

- creation bytecode; and
- the unpatched runtime template.

SHA-256 is used for repository/artifact integrity. Ethereum Keccak-256 is kept
as an EVM-facing code identity.

The complete bytecode hex is retained in the identity because later deployment
attestation must reconstruct expected deployment/runtime bytes exactly.

## Identity is not yet accepted for deployment

A successful dual-compiler review still records:

```text
compiled_identity_committed=false
deployment_attested=false
predecessor_lineage_attested=false
inventory_funding_verified=false
runtime_activation_authorized=false
public_activation_authorized=false
```

CI only demonstrates that the compiler identity can be reproduced.

The exact generated identity must be separately reviewed and committed to the
repository before it can become an input to a live Chain-2050 deployment
attestation.

## CLI boundary

`tools/buy-void-presale-fulfillment-compile-identity-cli-v1.mjs` has only two
commands:

- `input`: write the fixed Standard JSON compiler input;
- `review`: consume two already-produced compiler outputs and write the
  reviewed identity.

The CLI itself never runs a compiler, accesses RPC, reads credentials, signs,
broadcasts, deploys, funds inventory, or changes runtime enablement.

Generated files are private `0600` outputs.

## Next gate

After exact compiler identity is committed, the Chain-2050 deployment
attestation must prove:

- exact contract address;
- exact deployment transaction;
- constructor token/fulfiller/predecessor bindings;
- reconstructed deployed runtime bytecode;
- live `voidToken()`;
- live `maxInventoryAtoms()`;
- live `totalFulfilledAtoms()`;
- live `remainingInventoryAtoms()`; and
- complete predecessor lineage compatibility.

Inventory funding and runtime/public activation remain separate later gates.

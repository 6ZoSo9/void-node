# Chain-2050 role-authority registry dual compiler v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_DUAL_COMPILER_V1`

## Purpose

Lock a reproducible compiler identity for
`VoidChain2050RoleAuthorityRegistryV1` before any owner/deployer selection or
deployment transaction exists.

This gate intentionally precedes deployment preparation.

## Exact compiler profile

Both compiler environments receive the same Solidity Standard JSON input:

- Solidity `0.8.20+commit.a1b79de6`;
- EVM target `paris`;
- optimizer enabled, 200 runs;
- `viaIR=true`;
- default revert strings;
- CBOR metadata enabled;
- literal source content enabled;
- IPFS metadata bytecode hash;
- zero libraries.

The exact Standard JSON input is content-addressed.

### Why viaIR is required

An exact-head real compile under the otherwise-identical optimized legacy
pipeline (`viaIR=false`) was rejected by Solidity 0.8.20 with
`Stack too deep` during EVM code generation. Both native solc and solc-js
successfully produced Standard JSON output; the comparison gate surfaced the
compiler error before any bytecode could be accepted.

The deployment profile therefore uses the compiler-prescribed
`viaIR=true` with the optimizer enabled. This changes only the explicit
deployment compiler profile; it does not modify the accepted Solidity source
or grant deployment authority.

## Independent compilers

Environment A uses the official native
`ethereum/solc:0.8.20` container.

Environment B installs exact `solc@0.8.20` into an isolated temporary npm
prefix and records the `soljson.js` SHA-256.

The comparison requires distinct environment fingerprints, implementations,
and kinds.

## Compared artifacts

The review requires exact equality for:

- creation bytecode;
- runtime bytecode template;
- creation/runtime opcodes and source maps;
- ABI;
- compiler metadata;
- storage layout;
- method identifiers; and
- immutable-reference layout.

Compiler errors and link references fail closed.

## Runtime immutable

The contract has exactly one Solidity immutable:

`emptyRegistryRootSha256`

The compiler runtime object contains zero placeholders at all immutable
reference offsets.

The review patches every 32-byte immutable reference with the already-reviewed
empty registry root:

`d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7`

and derives the **expected deployed runtime SHA-256**.

This distinguishes the compiler runtime template from the byte-for-byte
runtime that `eth_getCode` must expose after deployment.

## Constructor boundary

The constructor is exactly:

`constructor(address initialOwner)`

This compiler gate does not choose that owner and therefore does not construct
deployment data.

The resulting review deliberately contains:

- `constructor_owner_address=null`;
- `deployment_data_sha256=null`;
- `owner_address=null`; and
- `deployer_address=null`.

## Authority boundary

All authority flags are false.

The compiler comparison tool does not run solc, Docker, RPC, wallets, signers,
or transactions. GitHub Actions executes the two compiler environments and
passes their public outputs into the pure comparison tool.

No owner/deployer key is accessed. No unsigned transaction is constructed.
No signing, broadcast, Chain-2050 mutation, registry append, service restart,
production activation, or funds movement occurs.

## Decision

Successful dual compilation remains:

`HOLD_PENDING_SOVEREIGN_BYTECODE_REVIEW_OWNER_DEPLOYER_BINDING_AND_UNSIGNED_DEPLOYMENT_TRANSACTION`

The workflow prints the exact:

- creation bytecode SHA-256;
- runtime template SHA-256;
- expected deployed runtime SHA-256;
- immutable-reference map;
- ABI/metadata/storage/method-identifier hashes.

Those exact-head values become the input to the next compiled-identity review
gate. They are not automatically accepted for deployment.

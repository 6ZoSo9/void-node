# Chain-2050 role-authority live RPC observer v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1`

## Purpose

Provide the missing read-only transport between a deployed
`VoidChain2050RoleAuthorityRegistryV1` and the already-merged canonical
role-authority contract projection / registry binding / participant session
guard.

This lane does **not** deploy the registry and does not invent a production
address.

If no accepted deployment exists, production remains held.

## RPC boundary

The observer accepts only loopback HTTP JSON-RPC and uses exactly:

- `eth_chainId`;
- `eth_blockNumber`;
- `eth_getBlockByNumber`;
- `eth_getCode`; and
- `eth_call`.

It has no send, unlock, admin, debug, wallet, signer, transaction, broadcast,
validator, Work Credit, or funds authority.

## Fixed-finality observation

The caller supplies an explicit positive confirmation depth.

For head `H` and depth `D`, all code and view calls are pinned to:

`H - (D - 1)`

The observer reads and then revalidates:

- exact observation-block hash;
- exact runtime code;
- exact entry count; and
- exact terminal registry root.

Any mismatch fails closed.

## Runtime identity

The caller must pin:

- exact contract address;
- expected runtime-code SHA-256; and
- reviewed registry-contract SHA-256.

The live observer recomputes SHA-256 over the exact `eth_getCode` bytes at
the fixed observation block and requires equality with the expected runtime
identity.

The reviewed registry-contract SHA-256 is configuration lineage, not a value
the observer can derive from chain bytecode. A later deployment-lineage gate
must supply it.

## Query contract identity

The observer exports a deterministic query-contract digest over its exact:

- Chain ID;
- transport kind;
- fixed-block policy;
- block/code/root revalidation requirements;
- RPC allowlist; and
- contract view set.

The finality-policy digest separately binds the requested confirmation depth.

These digests feed the already-merged role-authority binding descriptor.

## Snapshot

One successful observation reconstructs the exact merged contract snapshot
shape:

- empty registry root;
- entry count;
- terminal registry root; and
- every ordered `getEntry(index)` record.

The observer does not reimplement registry transition/root semantics.
The TypeScript live-RPC binding immediately feeds that snapshot through:

1. `projectChain2050RoleAuthorityContractSnapshotV1`;
2. `createChain2050RoleAuthorityContractSnapshotProviderV1`; and
3. `createChain2050RoleAuthorityRegistryReadSourceBindingV1`.

Canonical registry validation therefore remains single-sourced.

## Resource boundary

Entry count is bounded before enumeration. The default maximum is 4096 and the
hard configurable ceiling is 100000.

Each JSON-RPC response is byte-bounded and timeout-bounded.

## Deployment truth

A configured address + matching code is **not** itself deployment acceptance.

The observer reports:

`deployment_verified=false`

and:

`production_activation_authorized=false`

A separate deployment-lineage gate must establish the actual Mainnet-0
contract address, constructor/owner lineage, accepted registry-contract
identity, and production configuration.

## Next gate

After this observer is merged, the next gate is the deployment-lineage
attestation for `VoidChain2050RoleAuthorityRegistryV1`.

Only after that lineage is accepted should the public composition gateway be
wired to instantiate this observer and the merged role-aware session adapter.

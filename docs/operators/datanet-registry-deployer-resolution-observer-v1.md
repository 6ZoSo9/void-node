# DataNet registry deployer resolution observer v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1`

Status: source-only read-only observation capability.

## Purpose

Resolve the live Chain-2050 state required after the dedicated DataNet registry
deployer has been selected and before any unsigned deployment plan exists.

The observer binds:

- canonical Chain ID 2050;
- exact selected deployer;
- exact selected publisher;
- zero-address genesis predecessor;
- accepted DataNet compiled identity;
- exact constructor deployment-data hash;
- fixed observation block number/hash;
- deployer latest nonce;
- deployer pending nonce;
- deployer native balance;
- CREATE address derived from exact deployer + pending nonce;
- predicted address nonce; and
- predicted address code.

A green resolution requires:

- no pending deployer transaction (`latest_nonce == pending_nonce`);
- predicted address nonce equals zero; and
- predicted address code equals `0x`.

The pending nonce and observation block hash are re-read before GREEN.

## RPC boundary

Only loopback HTTP RPC is accepted. The allowed read methods are:

- `eth_chainId`
- `eth_blockNumber`
- `eth_getBlockByNumber`
- `eth_getTransactionCount`
- `eth_getBalance`
- `eth_getCode`

This gate deliberately performs no `eth_estimateGas`, fee selection, deployer
funding, transaction construction, signing, broadcast, deployment, or Chain-2050
mutation.

## Precision evidence runner

`ops/precision/void-datanet-registry-deployer-resolution-precision-v1.mjs`

The runner reads only public source artifacts from the repository, calls the
observer against loopback Chain-2050 RPC (default
`http://127.0.0.1:8545/`), and emits one JSON evidence packet to stdout.

The live evidence is not source truth until separately reviewed and bound into
the repository.

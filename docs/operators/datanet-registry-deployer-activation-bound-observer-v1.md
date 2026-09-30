# DataNet registry deployer activation-bound observer v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1`

Status: source-only read-observation bridge. No deployment authority.

## Purpose

Bind the already-reviewed DataNet registry deployer observer to the **actual
private Epoch-2 successor runtime** only after a successful guarded QBFT
activation receipt exists.

The older static
`ops/mainnet0/datanet-registry-deployer-resolution-target-v1.json` remains
intentionally HOLD. It is not rewritten or promoted. Historical/equivalence
ports therefore do not acquire production authority.

Instead, a valid private activation plan + activation receipt dynamically bind
the only accepted RPC:

`http://127.0.0.1:18553/`

## Activation lineage

The binding layer reconstructs the activation receipt through the canonical
#2114 receipt builder and requires:

- Chain ID 2050 / `0x802`;
- execution epoch 2;
- QBFT;
- exactly three validators and two-of-three quorum;
- successful block progression;
- all three validator services active;
- authoritative private successor block production already proven;
- transaction construction/signing/submission/broadcast still false;
- token/funds movement false;
- migration authorization false; and
- public activation authorization false.

A locally edited activation receipt is rejected even if its content-addressed ID
is recomputed.

## Read-only observer authority

The bound observer reuses
`VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1`.

Exactly these RPC method calls are permitted by its successful observation
sequence:

1. `eth_chainId`
2. `eth_blockNumber`
3. `eth_getBlockByNumber`
4. `eth_getTransactionCount` — deployer at observation block
5. `eth_getTransactionCount` — deployer pending
6. `eth_getBalance`
7. `eth_getTransactionCount` — predicted CREATE address
8. `eth_getCode` — predicted CREATE address
9. `eth_getTransactionCount` — deployer pending revalidation
10. `eth_getBlockByNumber` — block-hash revalidation

The observer derives the predicted CREATE address from the pending nonce and
requires its nonce to be zero and code to be empty for a green result.

It never accesses the deployer credential or any private key.

## Precision runner

The Precision runner requires:

- canonical clean `main`;
- a canonical activation-plan file;
- a canonical activation-receipt file;
- current repository ancestry descended from the activation lineage;
- the private QBFT service active locally; and
- the exact source-selected deployer, publisher, and compiled contract identity.

The result records SHA-256 of the activation plan/receipt files and the
activation receipt ID in the read-only evidence packet.

The observed successor head must also be greater than or equal to the final
block height proven in the activation receipt. A reset or regressed private RPC
therefore cannot inherit deployer-observation authority solely by reporting
Chain ID 2050.

## Explicitly forbidden

This lane does not:

- read secrets or credentials;
- access a wallet or signer;
- fund the deployer;
- construct a transaction;
- sign a transaction;
- submit or broadcast a transaction;
- deploy a contract;
- mutate Chain-2050;
- mutate validators;
- move tokens or funds;
- retry automatically;
- authorize migration; or
- authorize public activation.

## Next gate

A green observation may be bound into a **source-only unsigned registry
deployment plan** containing the exact deployer nonce, deployment creation data,
predicted registry address, and activation lineage.

That later source plan still must not access a key or submit a transaction.

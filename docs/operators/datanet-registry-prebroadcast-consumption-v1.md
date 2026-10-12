# DataNet registry pre-broadcast observation and consumption v1

Markers:

- `VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1`
- `VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1`

Status: fresh read-only observation plus durable one-use authorization
consumption. **No broadcaster access or transaction submission.**

## Purpose

After one exact single-transaction broadcast authorization exists, this lane
does two separate things:

1. prove the exact signed transaction is still eligible for one broadcast
   attempt using only read-only Chain-2050 RPC; and
2. durably consume that authorization before any broadcaster is allowed to
   access the signed transaction bytes.

The two operations are separate Precision entrypoints. A read-only observation
does not implicitly consume authorization.

## Runtime artifact boundary

The pre-broadcast observer accepts only the already-produced:

- broadcast request; and
- exact broadcast authorization.

It validates their content-addressed IDs, exact scope, exact authority maps,
operation-bound confirmation, transaction summary, lineage IDs, and five-minute
authorization window.

It deliberately **does not reopen the private signed-transaction artifact**.
The observer and consumption runner have no signed-transaction-file argument.

## Fresh read-only observation

The observer uses Precision loopback RPC and exactly these eleven methods:

1. `eth_chainId`
2. `eth_blockNumber`
3. `eth_getBlockByNumber`
4. `eth_getTransactionCount` — deployer pending nonce
5. `eth_getTransactionCount` — predicted CREATE address at observation block
6. `eth_getCode` — predicted CREATE address at observation block
7. `eth_getBalance` — deployer at observation block
8. `eth_getTransactionByHash` — exact signed hash
9. `eth_getTransactionReceipt` — exact signed hash
10. `eth_getTransactionCount` — deployer pending nonce recheck
11. `eth_getBlockByNumber` — observation block hash recheck

A green observation requires:

- Chain ID 2050;
- canonical CREATE address derived again from deployer + nonce;
- deployer pending nonce exactly equals the authorized transaction nonce;
- predicted address nonce zero and code empty;
- deployer balance covers `gasLimit * maxFeePerGas`;
- current base fee does not exceed the transaction max fee;
- exact signed transaction hash is not already known;
- exact signed transaction hash has no receipt;
- pending nonce remains stable through the observation; and
- observation block hash remains stable.

The observation expires after 120 seconds.

## Durable one-use consumption

Consumption requires the still-valid broadcast authorization and an unexpired
green pre-broadcast observation.

The caller supplies an already-existing canonical private state root:

- direct directory, no symlink ancestry;
- owned by the current operator;
- mode 0700.

The consumer pins the state-root device/inode generation, opens it through a
directory descriptor, and create-only publishes one immutable mode-0600 record
under:

`broadcast-consumed/<broadcast_operation_id>.json`

The broadcast operation ID is derived from:

- signed transaction ID;
- exact signed transaction hash; and
- transaction fingerprint.

A second attempt against the same state-root generation is rejected without
modifying the first record.

Both broadcast-authorization expiry and pre-broadcast freshness are rechecked
at entry and immediately before durable publication.

## Authority boundary

The observer performs read-only RPC only.

The consumer may write exactly one durable consumption record. It performs no
RPC.

Neither gate:

- opens signed transaction bytes;
- accesses a credential or private key;
- grants broadcaster access;
- submits a transaction;
- broadcasts a transaction;
- deploys a contract;
- mutates Chain-2050 or validators;
- moves tokens or funds; or
- retries automatically.

## Precision entrypoints

Read-only observation:

`ops/precision/void-datanet-registry-prebroadcast-observer-v1.mjs`

Durable consumption:

`ops/precision/void-datanet-registry-broadcast-authorization-consumption-v1.mjs`

The consumption state root must already exist and be mode 0700. This source
lane does not create it implicitly.

## Next gate

A green durable consumption receipt permits only:

`exact_single_attempt_registry_broadcast_execution_after_consumption_v1`

That future broadcaster must still recheck runtime expiry/state and may make at
most one `eth_sendRawTransaction` attempt for the exact signed hash. This lane
does not implement or authorize that send.

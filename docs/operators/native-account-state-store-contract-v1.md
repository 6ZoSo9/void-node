# Native Account State Store Contract v1

Marker: `VOID_NATIVE_ACCOUNT_STATE_STORE_V1`

## Purpose

This contract defines the authoritative persistent balance and nonce store
required by the canonical native VOID value-transfer transition.

It is source-only and unmounted. It does not wire block execution, create an
RPC endpoint, inject the store into the running node, enable Buy VOID automatic
fulfillment, or perform live money movement.

## Files

An explicit absolute root directory contains:

- `native-accounts-v1.snapshot.json`
- `native-accounts-v1.snapshot.next.json`
- `native-accounts-v1.intent.json`
- `native-accounts-v1.journal.jsonl`
- `native-accounts-v1.lock`

No environment variable chooses the root directory.

## Authoritative state

The snapshot stores sorted accounts with:

- normalized address
- native VOID balance in wei
- exact account nonce

It also stores every applied transaction idempotency key, transaction hash,
commit ID, resulting state version, and the latest commit ID.

The snapshot has a complete SHA-256 fingerprint. Initialization is explicit,
single-use, and requires:

`initializeNativeAccountStateStoreV1`

## Atomic apply-once protocol

The store implementation satisfies the state transition's injected method:

`apply_native_value_transfer_once`

Before any write, it verifies:

- exact request marker, version, and confirmation
- no raw signed transaction in the request
- current state version
- exact account balances and nonces
- prestate and poststate fingerprints
- sorted unique account changes
- exactly one nonce increment by one
- total balance reduction equals the declared burned fee
- unused transaction idempotency key

The durable write order is:

1. acquire exclusive lock
2. write and fsync intent
3. write and fsync next snapshot
4. atomically rename next snapshot over authoritative snapshot
5. append and fsync journal entry
6. remove intent
7. release lock

The resulting state version and commit ID are deterministic hashes of the
prior state and bound transaction plan.

## Crash recovery

Recovery requires:

`recoverNativeAccountStateStoreV1`

It never removes a live or young lock. A stale lock is removed only when its
recorded process is not alive and the minimum age policy is satisfied.

When an intent exists:

- snapshot still equals prestate: remove uncommitted next snapshot and intent
- snapshot equals poststate: ensure journal commit exists, then remove intent
- any other snapshot: hold for operator investigation

Recovery never fabricates account changes and never retries transaction
application automatically.

## Authority

When explicitly instantiated and called, this module has filesystem read/write
and native account mutation authority.

It has no direct authority for:

- private keys or mnemonics
- transaction signing
- network or RPC calls
- environment reads
- runtime routes
- block execution
- automatic retry
- raw signed transaction input or persistence

## Current deployment state

- module mounted: false
- production store injected: false
- canonical block executor wired: false
- chain-2050 RPC active: false
- Buy VOID automatic fulfillment enabled: false
- live state transition applied by this lane: false
- live money movement performed by this lane: false

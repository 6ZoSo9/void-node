# Native Account State Store Block-Atomic Extension v1

## Purpose

This extension adds the block-level atomic mutation method required by the
canonical native VOID block executor:

`apply_native_value_transfer_block_once`

The account store remains source-only and unmounted. Production account state
is still uninitialized, and canonical block processing is not wired.

## Block request validation

Before any write, the store verifies:

- exact block-executor marker, version, and confirmation
- deterministic block idempotency key
- canonical block hash and number
- transaction count and unique ordered transaction hashes
- transaction-plan binding count and SHA-256 shape
- parent state version and complete parent snapshot fingerprint
- sorted unique aggregate account changes
- exact balances and nonces for every changed account
- total nonce increase equals the block transaction count
- aggregate value reduction equals the declared fee burn
- final full-account fingerprint at the planned final state version
- raw signed transactions are absent

## Durable block apply-once

Block idempotency is checked from the durable journal before stale parent-state
checks. A replay returns:

`native_value_transfer_block_already_applied`

The block is committed with the existing exclusive lock and shared crash intent:

1. acquire lock
2. write and fsync block intent
3. write and fsync next account snapshot
4. atomically rename next snapshot over the authoritative snapshot
5. append and fsync the block journal entry
6. remove intent
7. release lock

All aggregate account changes and the final state version become visible
together. Per-transaction commits are not used.

## Recovery

The existing exact-confirmation recovery path now validates both transaction
and block journal entries.

- snapshot equals intent prestate: remove uncommitted intent
- snapshot equals block poststate: ensure the block journal commit exists
- divergent snapshot: hold for operator investigation

Recovery does not replay the block or reconstruct raw transactions.

## Authority boundary

When explicitly instantiated and called, this method has durable native-account
mutation and money-movement authority.

This lane does not:

- initialize production account state
- inject the store into the running node
- mount the block executor
- alter block production or consensus
- create RPC or HTTP routes
- read environment variables or secrets
- sign or broadcast transactions
- restart the node
- apply a live block
- enable Buy VOID automatic fulfillment

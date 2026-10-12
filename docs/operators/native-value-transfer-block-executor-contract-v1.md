# Native Value Transfer Block Executor Contract v1

Marker: `VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1`

## Purpose

This contract defines deterministic canonical block execution for signed native
VOID value transfers.

It is source-only and unmounted. It does not instantiate the authoritative
account store, change block production, create an RPC endpoint, inject a signer,
restart the node, or enable Buy VOID automatic fulfillment.

## Preparation

The executor receives:

- canonical block hash and block number
- one authoritative account-store snapshot
- ordered signed transaction inputs
- per-transaction transfer and fee policies
- block-level amount, fee, count, and raw-byte limits

Every transaction is prepared through the canonical state-transition function.
The executor advances an in-memory projected balance, nonce, and state version
after each transaction.

The entire block is held before mutation when any transaction:

- fails signature, chain, type, gas, nonce, balance, or fee validation
- repeats a transaction hash
- disagrees with the projected prestate
- exceeds a block-level policy bound

## Atomic block plan

A successful plan contains no raw signed transactions. It binds:

- parent account snapshot and state version
- canonical ordered transaction hashes
- every transaction plan binding
- final projected state version
- final account fingerprint
- aggregate account changes
- total native value, fee debit, fee credit, and fee burn
- deterministic block idempotency key
- complete block binding hash

No per-transaction store apply is permitted.

## Apply boundary

Mutation requires exact confirmation:

`applyNativeValueTransferBlockV1`

and one injected atomic store method:

`apply_native_value_transfer_block_once`

The store receives only hashes, bindings, aggregate changes, and totals. Raw
signed transactions never cross the store boundary.

A block-store error is treated as an unknown outcome with automatic retry
disabled. A success receipt must match the planned block hash, number,
transaction count, and final state version.

## Required future store extension

The current native account store implements transaction-level apply-once. It
does not yet implement this block-atomic interface. A later source lane must add
block-level intent, snapshot, journal, idempotency, and recovery semantics before
this executor can be wired to canonical block processing.

## Current deployment state

- module mounted: false
- production account store initialized: false
- block-atomic store method implemented: false
- canonical block executor wired: false
- chain-2050 RPC active: false
- Buy VOID automatic fulfillment enabled: false
- live state transition applied by this lane: false
- live money movement performed by this lane: false

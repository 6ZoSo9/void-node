# Native Block Execution Precommit Integration v1

Marker: `VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1`

## Purpose

This lane adds one disabled-by-default, prepare-only native block execution
hook to the canonical `sealOnce` path.

The hook is placed after canonical transaction selection and before txroot computation and existing commit-side effects. The proven source window was
identified by the exact `sealOnce` audit chain as after line 19636 and before
line 19665 at source target
`c68c49676e5a7db109746fdb76a27136172880c8`.

## Current runtime behavior

The canonical call is hard-disabled:

- `enabled: false`
- `confirmation: null`
- `prepare_dependency: null`

Disabled mode returns before reading candidate transactions or the dependency.
It performs no filesystem, network, RPC, signing, broadcast, state, block,
mempool, or money mutation.

## Prepare-only boundary

When a future source lane explicitly enables the hook, it must provide:

- exact confirmation `prepareNativeBlockExecutionPrecommitV1`
- one injected preparation dependency
- the canonical ordered candidate transaction array
- the exact candidate transaction count

The dependency may prepare and reject a native execution plan. It may not apply
the account store or mutate canonical block state.

A held or failed preparation throws before the existing txroot and commit-side
operations. Automatic retry is forbidden.

## Explicit exclusions

This lane does not:

- import or invoke the block executor apply function
- create, initialize, or inject the production account store
- call `apply_native_value_transfer_block_once`
- alter canonical block persistence, head advancement, txroot persistence, or
  mempool consumption
- deploy or restart the running node
- enable a chain-2050 RPC endpoint
- sign or broadcast a live transaction
- apply a live state transition or block
- move VOID
- enable Buy VOID automatic fulfillment

The production account store is not initialized. The block executor apply is not wired. Buy VOID automatic fulfillment is not enabled.

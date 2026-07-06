# Peer Block Import Validation Boundary v1

Status: green

Marker:

```text
VOID_PEER_BLOCK_IMPORT_VALIDATION_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Prove and harden the peer block import boundary so untrusted peer data cannot reach persistent block storage unless it passes explicit append/import validation.

## Implemented boundary

- `src/chain/block.ts` now exports `validateBlockForAppend()`.
- `src/chain/seg_store.ts` validates blocks at the storage boundary before append persistence.
- `SegStore.saveBlock()` rejects conflicting existing blocks instead of silently accepting same-height divergent content.
- `src/node_core.ts` no longer persists `void/block` pubsub header announcements.
- `Node.pullOnce()` validates imported peer blocks before calling `store.saveBlock()`.

## Validation checks

`validateBlockForAppend()` checks:

- block object shape
- finite nonnegative block number
- timestamp presence
- 64-hex parent hash
- 64-hex tx root
- 64-hex blob root
- tx array shape
- blob reference shape
- computed tx root matches header tx root
- computed blob root matches header blob root
- genesis parent hash is zero
- non-genesis parent block exists
- non-genesis parent hash matches the local parent block hash

## Proof coverage

`scripts/prove_peer_block_import_validation_boundary.ts` proves:

- peer block with wrong parent hash is rejected
- peer block with wrong tx root is rejected
- rejected peer blocks are not persisted
- valid peer block imports successfully
- direct invalid `SegStore.saveBlock()` append is rejected

## Explicit limitation

This proof does not yet validate proposer authority or block signatures because that requires an authenticated proposer-key / validator-runtime-truth map. That should be a later hardening lane.

This proof also does not implement trustless fork choice or multi-peer quorum. It hardens append/import validation at the local persistence boundary.

# DataNet public chunk snapshot budget v1

## Purpose

Issue #2976 follows the descriptor-custody repair in #2958.

The public chunk GET path must serve the exact byte snapshot that was hashed from
the retained descriptor. That intentionally keeps one Buffer alive while the
response is in flight. A per-file 64 MiB limit alone does not bound aggregate
external memory when several public responses are concurrently flushing.

This successor keeps the exact-byte guarantee and adds process-level admission
before snapshot allocation.

## Source contract

Production defaults are repository-owned constants:

- maximum one snapshot reservation: 64 MiB, inherited from the existing chunk
  ceiling in `src/http/datanet_routes.ts`;
- aggregate public GET snapshot reservations: 128 MiB;
- maximum simultaneous public GET snapshot reservations: 8.

The byte ceiling and count ceiling both apply. Two maximum-sized 64 MiB
snapshots can therefore consume the aggregate budget; an additional public GET
is rejected until capacity is released.

The budget is process-global for this route module rather than per request or
per router mount.

## Admission ordering

The retained chunk fd is opened and its metadata is checked first. For public
GET, the exact `before.size` is then reserved from the process budget **before**
`Buffer.allocUnsafe(before.size)` or any chunk body read.

If capacity is unavailable, the route returns:

- HTTP 503;
- `Retry-After: 1`;
- JSON error `datanet_chunk_snapshot_capacity_exceeded`.

The overload path may inspect metadata needed to price the reservation, but it
does not allocate or read the chunk snapshot body.

## Reservation ownership and release

Each successful admission returns an opaque request-owned release closure backed
by a private reservation identity. The public API does not accept a caller
chosen reservation id, so one request cannot release another request's
reservation. Releasing the same reservation twice is idempotent.

A reservation is released on:

- response `finish`;
- response `close`;
- response `error`;
- request `aborted`;
- an already-aborted/destroyed connection observed before send;
- synchronous response-send failure;
- hash, descriptor identity, short-read, or other verification failure after
  admission.

The snapshot buffer remains reserved while the response is in flight; admission
is not released immediately after `res.end()`.

## Preserved #2958 properties

This successor does not replace exact-byte snapshots with mutable streaming.

The predecessor proof is run in the focused workflow and must continue to prove:

- `O_NOFOLLOW` chunk opens;
- retained descriptor identity checks;
- exact snapshot SHA-256 validation;
- visible-path swap after verification cannot change served bytes;
- same-inode mutation after verification cannot change served bytes;
- symlink GET rejection;
- create-only PUT staging/publication;
- retained staging descriptor publication checks;
- foreign substitution preservation/fail-closed behavior;
- no overclaim of atomic same-UID pathname cleanup.

PUT validation does not consume the public GET snapshot budget; #2976 is an
admission boundary for publicly served retained snapshot buffers.

## Focused proof

Run after build:

```sh
node scripts/prove_datanet_chunk_snapshot_budget_v1.mjs
node scripts/prove_datanet_chunk_descriptor_custody_v1.mjs
npm run typecheck -- --pretty false
```

The budget proof checks aggregate exhaustion and recovery, count exhaustion,
request-owned release tokens, double-release behavior, overload rejection before
allocation, verification-failure release, response/client lifecycle release,
stable overload status, and static admission-before-allocation ordering.

## Authority boundary

Source/test/CI only.

This change does not perform or authorize production runtime/service/network
mutation, storage cleanup, credential/key/wallet/signer access, transactions,
validator or Work Credit mutation, presale/market activation,
treasury/liquidity, or funds movement.

It does not claim a whole-process RSS ceiling. Other application allocations
remain separate resource domains.

# Buy VOID append-only allocation reservation v1

Marker: `VOID_BUY_VOID_ALLOCATION_RESERVATION_V1`

Status: **source capability; unmounted; activation HOLD**.

## Purpose

This contract closes the durable evidence shape tracked by #2432 without
collapsing it into verified-payment capacity admission.

A durable `payment_verified` row is the finite-capacity obligation. The
allocation reservation is a second append-only record that may be written only
after that exact obligation already exists. Losing or delaying the allocation
record therefore cannot create extra capacity.

The source capability is intentionally not mounted into `src/index.ts`.
Source-green is not deployed or active.

## Deterministic lineage

`persistBuyVoidAllocationReservationV1({ request_dir, request_id })` accepts no
caller-selected payment identity, amount, verified-event digest, launch
generation, allocation ID, timestamp, or output path.

It reconstructs the reservation from descriptor-bound durable history:

- latest consistent request revision from `requests.jsonl`;
- exact canonical payment identity
  `voidpay1:<source_chain>:<tx_hash>:<log_index>`;
- exact durable verified-payment v2 JSONL row and SHA-256 of its serialized row
  bytes including the terminating newline;
- exact quoted VOID converted to integer micro-VOID;
- the request's coupled launch ID, source-composition ID, activation generation,
  generation tip, activation receipt identity/digest, and request lease expiry.

The allocation ID is:

`voidalloc1_<sha256(canonical immutable allocation body)>`.

No response time or caller timestamp participates in uniqueness.

## Ordering and crash semantics

The later runtime integration must compose this capability after the merged
verification-time capacity transition:

```text
capacity lock
  -> descriptor-bound authoritative ledger census
  -> launch-generation authority
  -> request lock
  -> request/payment identity and finite-capacity admission
  -> durable payment_verified append + fsync
  -> durable allocation_reserved create-once publication
  -> sidecar / response
```

This module does not create a capacity obligation and does not append
`payment_verified`.

Therefore the crash schedules are fail-safe:

- crash before durable `payment_verified`: no valid allocation can be created;
- crash after `payment_verified` and before allocation: exact replay derives
  the same deterministic allocation and creates it once;
- crash after create-only allocation publication and before response: replay
  verifies the exact record and returns idempotence;
- crash after the final hard-link but before temp cleanup: exact same-inode temp
  cleanup is recoverable before the final record is admitted.

## File custody

Authority reads use pinned directories/direct files, `O_NOFOLLOW`, same-UID
ownership, private modes, bounded sizes, bounded descriptor reads, before/after
descriptor identity and timestamps, and visible-path rebinding.

The allocation directory is private and append-only. Its child directory is
opened through the already-pinned request-directory descriptor and compared
against the visible child before use; the parent is revalidated after the child
open so parent renames and child-entry swaps fail closed before publication.

Publication uses:

1. exclusive private temp file;
2. exact canonical JSON bytes;
3. file `fsync`;
4. create-only hard link to the deterministic final filename;
5. parent-directory `fsync`;
6. temp unlink;
7. second directory `fsync`;
8. descriptor-bound readback.

No existing final record is overwritten.

## History invariants

Every published allocation must still resolve to:

- exactly one durable request;
- exactly one durable verified-payment v2 row;
- one canonical payment identity;
- one request ID;
- one verified-event digest; and
- the request's exact authoritative quote and launch snapshot.

One payment, request, verified event, or allocation ID cannot map to a second
non-identical allocation. Unknown entries, malformed/truncated ledgers, quote
drift, source/tx drift, orphan records, path swaps, growth during read, or total
allocation history above 10,000,000 VOID HOLD.

## Verification

```bash
npx tsx scripts/prove_buy_void_allocation_reservation_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof includes exact replay, both crash recovery shapes, duplicate
payment/request adversaries, quote drift, malformed and orphan allocation
history, path replacement, growth during descriptor read, and a concurrent
near-sellout composition with the merged verified-payment capacity admission.

## Authority boundary

This source module performs local append-only accounting evidence only. It grants
no wallet/signer/private-key access, payment receipt verification, live payment
acceptance, transaction construction/signing/broadcast, Chain-2050 write,
inventory funding or movement, VOID/USDC transfer, market activation, presale
activation, public Buy intake activation, treasury/liquidity action, or funds
movement.

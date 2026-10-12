# Buy VOID Allocation Reservation High-Water v1

Marker: `VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1_GREEN`

## Purpose

Define the pure source contract that closes the rollback ambiguity documented by
the allocation-reservation ledger contract.

The allocation JSONL hash chain proves continuity only inside the ledger bytes
presented to it. A genuine earlier prefix or an empty ledger can still be
internally valid. This high-water contract defines the external state that a
future protected runtime writer must preserve so those rollback states can be
rejected deterministically.

This lane is source-only. It performs no filesystem reads or writes and does not
create, append, rename, fsync, activate, sign, broadcast, reserve inventory, or
move funds.

## Canonical high-water

The high-water is one canonical JSON line with exactly:

- `schema=void_buy_void_allocation_reservation_high_water_v1`;
- `marker=VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1`;
- `version=1`;
- `record_count`;
- `tip_hash`;
- `ledger_sha256`;
- `ledger_bytes`;
- `pool_void_total`;
- `reserved_void_total`; and
- `remaining_void`.

The high-water is derived only from
`classifyBuyVoidAllocationReservationLedgerV1(...)`. It does not implement a
second ledger parser or a second economic model.

For the empty ledger, the canonical high-water is still economically explicit:

- `record_count=0`;
- tip = allocation-reservation genesis hash;
- ledger SHA-256 = SHA-256 of zero bytes;
- `ledger_bytes=0`;
- pool = `10000000` VOID;
- reserved = `0`; and
- remaining = `10000000`.

That removes the "null inventory state" ambiguity from the external monotonic
anchor while preserving the parent ledger contract unchanged.

## Exact binding

`classifyBuyVoidAllocationReservationHighWaterBindingV1(...)` requires the
presented ledger to match the authoritative high-water exactly across:

1. record count;
2. hash-chain tip;
3. complete ledger byte SHA-256;
4. complete ledger byte length;
5. canonical pool total;
6. reserved total; and
7. remaining total.

The high-water JSON itself must use the exact reviewed field set, ordering,
canonical compact serialization, and final newline.

Therefore, if a two-record ledger/high-water pair has previously been accepted:

- presenting the valid one-record prefix with the two-record high-water HOLDs;
- presenting an empty ledger with the two-record high-water HOLDs;
- changing only count, tip, digest, byte length, reserved total, or remaining
  total HOLDs; and
- pretty-printed or reordered high-water bytes HOLD.

## Monotonic transition contract

`planBuyVoidAllocationReservationHighWaterAdvanceV1(...)` is also pure.

It first requires exact binding of the current ledger to the current
authoritative high-water.

It then permits only two outcomes:

### Idempotent

The next ledger bytes are byte-for-byte identical to the current ledger. The
high-water is unchanged and no operation is performed.

### Planned single append

The next ledger must:

- contain the current ledger as an exact byte prefix;
- contain exactly one additional validated allocation record;
- increase `record_count` by exactly one; and
- change the ledger tip.

Because the next ledger is validated by the parent ledger classifier, the new
record must also preserve the parent contract's hash chain, request/payment
uniqueness, canonical presale economics, exact micro-VOID arithmetic, launch
authority lineage, payment-event digest, evidence bindings, and inventory
conservation.

A two-record jump from an empty high-water is rejected even if the final ledger
is internally valid. A same-length alternate branch is rejected. A caller may
not silently replace accepted history with another valid history.

## What this closes

This source contract closes the previously documented **semantic** gap:

> given an authoritative high-water, can the current ledger be proven to be
> exactly the accepted history rather than an internally valid rollback?

Yes. The answer is an exact count + tip + full-ledger digest + byte-length +
inventory-state binding.

## What this does not close

This contract does **not** create a trustworthy external high-water by itself.

The following remain false:

- protected high-water storage;
- filesystem read/write authority;
- allocation-ledger write authority;
- high-water write authority;
- crash-recoverable ledger/high-water publication;
- runtime integration;
- production rollback enforcement without an authoritative high-water;
- presale activation;
- automatic fulfillment; and
- funds movement.

A process that lets an attacker roll back both the ledger and the high-water
together is still unsafe. The high-water must live in separately protected,
monotonic runtime custody.

## Required later publication protocol

The later runtime writer must operate under the reviewed allocation/capacity
serialization boundary and, at minimum:

1. open/pin the private allocation ledger and protected high-water without
   following symlinks;
2. read both from retained descriptors;
3. require exact current ledger/high-water binding using this contract;
4. plan exactly one allocation record with the parent ledger planner;
5. derive the exact next high-water with this contract;
6. durably publish ledger growth and high-water advancement through one
   crash-recoverable protocol;
7. fsync all accepted data and required parent directories;
8. recover deterministically from every crash point between ledger append and
   high-water advancement;
9. after recovery, accept only either the old exact pair or the new exact pair;
10. reject ledger-new/high-water-old, ledger-old/high-water-new, shorter-prefix,
    empty-after-nongenesis, alternate-branch, digest mismatch, or count/tip
    mismatch states; and
11. publish any orchestration sidecar only after the durable pair is accepted.

The exact publication mechanism is intentionally not selected by this source
contract. A later writer may use a WAL, create-only intent/commit records,
dual-slot generation protocol, or another reviewed equivalent, but it must
prove those crash states.

## Authority boundary

`VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1` reports:

- source contract: true;
- pure high-water binding: true;
- exact count/tip/digest/length/inventory binding: true;
- monotonic single-append validation: true;
- rollback detection **when authoritative high-water is provided**: true;
- protected high-water storage: false;
- crash-recoverable publication: false;
- runtime integration: false;
- filesystem read/write: false;
- allocation reservation write: false;
- high-water write: false;
- wallet/signer/private-key access: false;
- transaction construction/signing/broadcast: false;
- Chain-2050 mutation: false;
- market/presale activation: false;
- production gate ready: false; and
- funds movement: false.

## Verification

```bash
npx tsx scripts/prove_buy_void_allocation_reservation_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_ledger_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof uses only in-memory synthetic ledger and high-water bytes.

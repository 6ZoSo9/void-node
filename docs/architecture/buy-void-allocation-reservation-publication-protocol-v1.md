# Buy VOID Allocation Reservation Publication Protocol v1

Marker:
`VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1_GREEN`

## Purpose

Define the pure crash-recovery protocol that a later private allocation writer
must follow when advancing the append-only allocation ledger and its protected
high-water.

This contract is stacked on:

1. the allocation-reservation ledger contract; and
2. the allocation-reservation high-water contract.

It deliberately does **not** perform filesystem I/O. It defines the intent
bytes, the only accepted publication phases, and the recovery decision that a
later writer must implement under the existing Buy VOID serialization
boundary.

## Why a publication intent is required

The high-water closes rollback only if ledger and high-water cannot silently
diverge across a process crash.

A writer that appends the ledger and then crashes before updating high-water
creates a legitimate intermediate state. A writer that updates high-water
first creates an unsafe state: the protected authority claims history that the
ledger does not yet contain.

The publication protocol therefore has one forward order:

```text
write durable intent
  -> append/fsync allocation ledger
  -> publish/fsync protected high-water
  -> postcheck exact ledger/high-water pair
  -> remove durable intent
```

The source contract models that order without writing any file.

## Intent contents

The canonical intent binds exactly one planned allocation record and the exact
prior/next states.

It contains:

- allocation `record_id`;
- allocation `record_hash`;
- prior record count and tip;
- prior full-ledger SHA-256 and byte length;
- prior high-water SHA-256, byte length, and exact bounded base64 bytes;
- next record count and tip;
- next full-ledger SHA-256 and byte length;
- next high-water SHA-256 and byte length;
- SHA-256 of the exact appended record bytes;
- base64 of only the appended record bytes;
- base64 of the exact prior high-water bytes; and
- base64 of the exact next high-water bytes.

The intent does **not** duplicate the complete prior or next ledger. Recovery
needs only the exact single append plus the exact prior/next high-water bytes.
Each high-water payload is independently bounded to 4096 bytes, so the intent
remains bounded even when the allocation ledger grows toward its reviewed
64 MiB ceiling.

Intent JSON is schema-closed, compact/canonical, and final-newline terminated.
All hashes and base64 payloads are re-derived during parsing.

## Build admission

`buildBuyVoidAllocationReservationPublicationIntentV1(...)` first requires:

- current ledger and current high-water bind exactly under the high-water
  contract; and
- the proposed next ledger is a `planned` one-record append under
  `planBuyVoidAllocationReservationHighWaterAdvanceV1(...)`.

An unchanged/idempotent ledger does not need a publication intent and HOLDs if
a caller tries to create one.

A two-record jump, alternate history, rollback, or non-prefix transition cannot
create an intent.

The final allocation record must be the next ledger tip and its deterministic
record ID/hash are carried in the intent for retry binding.

## Recovery classification

`classifyBuyVoidAllocationReservationPublicationRecoveryV1(...)` accepts
exactly three observed states while an intent exists.

### 1. `intent_only`

Observed state:

- ledger = exact prior ledger;
- high-water = exact prior high-water.

Recovery action required later:

- append the exact intent-bound allocation record bytes;
- publish the exact next high-water;
- postcheck;
- remove intent.

### 2. `ledger_committed`

Observed state:

- ledger = exact next ledger;
- high-water = exact prior high-water.

The classifier proves the next ledger consists of the exact prior prefix plus
the exact intent append, that the derived prior prefix still matches the
intent's prior count/tip/digest/length, and that the intent-carried exact prior
high-water bytes semantically bind to that reconstructed prior prefix.

Recovery action required later:

- do **not** append again;
- publish the exact next high-water;
- postcheck;
- remove intent.

### 3. `complete`

Observed state:

- ledger = exact next ledger;
- high-water = exact next high-water.

Before accepting this phase, recovery reconstructs the exact prior ledger
prefix and requires the intent-carried exact prior high-water bytes to bind to
that prefix. A self-consistent next state therefore cannot make tampered
prior-state intent fields irrelevant.

Recovery action required later:

- no ledger/high-water write;
- postcheck;
- remove intent.

## Rejected mixed states

The classifier fails closed on:

- prior ledger + next high-water (**high-water ahead**);
- any ledger not matching exact prior or next fingerprint;
- any high-water not matching exact prior or next bytes/digest;
- next ledger whose prior prefix does not match the intent;
- next ledger whose append differs from the intent append;
- tampered append payload/hash/base64;
- tampered prior or next high-water payload/hash/length/base64;
- noncanonical intent JSON;
- multi-record jumps;
- alternate same-generation history; and
- retry attempts targeting a different allocation record ID/hash.

There is no backward recovery transition.

## Relationship to the coupled-launch publisher

The repository already has a reviewed intent/journal/external-anchor recovery
pattern for coupled-launch generation publication. This allocation protocol
reuses that **shape**:

- intent before mutation;
- one forward publication order;
- recoverable known intermediate state;
- separately bound authority state;
- exact postcheck before intent removal; and
- unknown/mixed states fail closed.

It does not reuse the coupled-launch generation authority lock or files. The
allocation writer has a different economic authority domain and must compose
with the verified-payment capacity / duplicate-identity serialization boundary.

## Required later runtime writer

A later source lane must still implement and prove:

1. private path custody;
2. no-follow directory/file opens;
3. one reviewed lock order spanning duplicate guard, capacity admission,
   allocation ledger, protected high-water, and request closeout as applicable;
4. durable create-only or atomic intent publication;
5. descriptor-bound allocation append;
6. append fsync;
7. protected high-water atomic publication + fsync;
8. parent-directory fsyncs;
9. recovery at every crash point;
10. exact post-state classification with this source contract;
11. intent removal only after accepted postcheck; and
12. no duplicated allocation, signing, broadcast, or funds effect during
    recovery.

That writer must prove the separately protected high-water cannot be rolled
back together with the private allocation ledger.

## Authority boundary

`VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1` keeps all
mutation authority false:

- runtime integration: false;
- protected high-water storage: false;
- filesystem read/write: false;
- allocation reservation write: false;
- high-water write: false;
- publication-intent write: false;
- wallet/signer/private-key access: false;
- transaction construction/signing/broadcast: false;
- Chain-2050 mutation: false;
- market/presale activation: false;
- production gate ready: false; and
- funds movement: false.

## Verification

```bash
npx tsx scripts/prove_buy_void_allocation_reservation_publication_protocol_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_ledger_v1.ts
npm run typecheck
npm run build
git diff --check
```

All focused publication tests use only in-memory synthetic bytes.

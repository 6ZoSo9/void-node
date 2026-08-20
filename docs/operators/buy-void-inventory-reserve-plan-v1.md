# Buy VOID Inventory Reservation and Bounded Execution Plan v1

Marker: `VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1`

## Purpose

This lane is the next bounded revenue step after the automatic payment
observation and duplicate-safe fulfillment claim worker.

It converts one persisted fulfillment claim into two durable, recovery-safe
reservations:

1. an aggregate reservation against the fixed Buy VOID pool inventory; and
2. one execution-attempt reservation through the existing execution-attempt
   journal.

It still does **not** deliver VOID.

## Inventory model

The inventory journal derives a deterministic pool key from the configured
`pool_id` and stores immutable reservation records beneath that pool.

Every reservation and paid-unreservable liability is now committed through a
recoverable transaction spanning two distinct local authority trees.

The mutable projection tree remains beneath
`buy-void-inventory-reservation-v1/` and contains the local history index,
expectations, reservations, and paid-unreservable obligations. A separate sibling
authority, `buy-void-inventory-history-anchor-v1/`, is outside that journal
subtree and retains the committed tail.

Creation uses this order:

1. atomically persist/fsync one exact pending-creation transaction in the anchor
   authority;
2. append/fsync the local history-index entry;
3. create/fsync the expectation projection;
4. create/fsync the reservation or obligation projection;
5. append/fsync the separate anchor entry — the commit point;
6. remove the pending transaction.

If a process stops before the anchor commit, the next apply may roll forward only
that exact pending transaction. Torn local-index/anchor tails are recoverable only
when the torn bytes are a prefix of the exact pending entry. Preview/read remains
fail-closed while a pending transaction exists.

After the anchor commit, missing, renamed, malformed or substituted projections
remain corruption and HOLD; they are not silently recreated. The local index and
separate anchor must match sequence-for-sequence on kind, pool, record ID,
fingerprint, and local index-entry SHA.

A pool lock is now an atomically-created private regular owner file in the
separate anchor authority. It binds PID, Linux process-start ticks, boot ID, and
nonce, so PID reuse is not mistaken for the recorded owner. Reclamation first
hard-links the observed inode into a fixed fence and deletes the public name only
if both names still identify that inode. A live external process instance remains
busy unless its exact nonce-bound durable release terminal proves that logical
ownership ended. A dead, PID-reused, same-process abandoned, or durably released
lock is recoverable. Exact readback plus parent-directory resync resolves
uncertain publication. If physical release fails, another process can reclaim
through the inode fence while the original process remains alive; without the
release terminal, a live owner is non-stealable.
The process-instance evidence is Linux `/proc` authority; if that evidence cannot
be read or validated, mutation fails closed rather than guessing ownership.

All durability-authoritative directories and files must be current-UID owned,
private mode, regular/non-symlink objects. First-use directory creation fsyncs
each parent namespace. Existing-path retries re-fsync publication directories.
Each transaction opens the configured root one component at a time with
directory/no-follow descriptors, verifies that the public root still identifies
the pinned inode, and performs descendant work through that pinned
`/proc/self/fd` namespace. Every durability-critical leaf read, create, link,
unlink, append, repair, directory scan, and fsync additionally pins its exact
private parent directory until the operation completes and rechecks that the
public descendant still names the pinned generation. A configured-root or lower
descendant generation change before or during the operation HOLDs; replacement
trees are never consumed as durability evidence or used as publication
authority.
Single JSON records are bounded to 1 MiB; index and anchor JSONL are scanned in
64 KiB chunks with 64 MiB aggregate and 256 KiB line limits while file identity
is stable. Durable numeric/string/identity fields keep exact JSON runtime types,
and type-sensitive fingerprints prevent values such as `"100"` and `100` from
aliasing.

The separate anchor detects coherent rollback of the journal subtree: truncating
the local index by a valid suffix while deleting the matching expectation and
record suffix leaves an anchor/index mismatch and HOLDs before capacity can
reopen or liability can disappear.

This contract does not claim protection against a coordinated rollback that also
rewinds the separate anchor authority itself.

Existing nonempty history without the required anchor lineage is not silently
adopted; it remains held for explicit reviewed migration.

Each reservation binds:

- pool ID and inventory-policy version;
- fixed pool capacity;
- payment key;
- request key;
- canonical payment identity;
- fulfillment instruction ID;
- delivery address;
- VOID amount;
- fulfillment-intent fingerprint.

Available inventory is recomputed as:

```text
fixed pool capacity
minus
sum of every valid immutable reservation in the pool
```

A pool-scoped exclusive owner lock serializes reservation writes. A lock whose
owner PID is still alive remains busy; a valid lock left by a dead process is
reclaimed before the next mutation.

The reservation is duplicate-safe. Replaying the same exact fulfillment intent
returns the existing reservation. Reusing a payment, request, payment identity,
or instruction with a conflicting intent is held.

## Worker boundary

The worker processes exactly one fulfillment intent per invocation.

Default behavior is dry-run. A mutation requires:

```text
confirmation=buyVoidAutoReservePlan
```

On apply, ordering is deliberately:

```text
inventory reservation
then
execution-attempt reservation
```

This prevents an execution attempt from existing without an inventory
reservation. If execution-attempt reservation later holds, the inventory
reservation remains committed and the same request can be rerun after review.
The duplicate-safe inventory reservation is recovered, then the execution
attempt can be completed.

The execution boundary is fixed to:

- VOID chain ID `2050`;
- one attempt per payment in this lane;
- a nonempty server-controlled fulfillment-wallet allowlist;
- no wallet selection or wallet access by this worker.

## Explicitly inactive

This lane does not:

- update the public Buy VOID request journal;
- decrement inventory after delivery;
- release inventory;
- close the pool when sold out;
- select a wallet;
- access a private key;
- sign a transaction;
- prepare a signed transaction;
- broadcast a transaction;
- move VOID;
- mount a route;
- start a background loop;
- execute during startup;
- modify `src/index.ts`;
- restart a service;
- modify Tailscale.

## Next revenue step

The next lane should bind the inventory reservation and execution-attempt
reservation to a disabled-by-default native execution worker. That worker must
use the existing chain-2050 signer/broadcaster, require a separate exact
confirmation, preserve the one-request cap, record the delivery transaction
before broadcast outcomes are advanced, and keep automatic runtime activation
off until a controlled live canary is ready.

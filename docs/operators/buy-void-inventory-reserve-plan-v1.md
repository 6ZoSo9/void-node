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

A pool-scoped exclusive lock serializes reservation writes. The implementation
fails closed when the lock is already present. It does not automatically break
a stale lock.

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

# Buy VOID history-carrier lifecycle mount v1

## Purpose

This composition mounts the previously source-only history-carrier successor
primitives at the durable Buy VOID payment lifecycle boundaries. It removes the
source-level `history_carrier_successor_publication_not_mounted` hold without
enabling Buy VOID runtime apply, public activation, signing, broadcast, or funds
movement.

The carrier root still mutates only through
`publishBuyVoidHistoryCarrierRootSuccessorV1` behind the reviewed successor
publication gate. Segmented history successors still come from the bounded
segmented producer.

## Reservation ordering

The canonical `verify_reserve_and_claim` apply path is:

1. verify the confirmed payment;
2. build the claim intent;
3. durably reserve inventory, or durably record a paid-unreservable obligation;
4. append exactly one canonical primary record to the live segmented history
   namespace;
5. publish the next segmented durable root;
6. build and publish the exact carrier successor;
7. only then persist a new fulfillment claim.

If carrier publication fails after durable reservation, the command holds with
restart recovery required. A duplicate invocation first checks current carrier
membership and never appends the same primary record into another segmented
generation.

## Segmented-history namespace

Live mutation is isolated under:

```text
<runtime-root>/buy-void-payment-history-segmented-live-v1/
```

The accepted legacy migration generation remains immutable. The live
durable-root authority bootstraps generation 1 by verifying the legacy
generation's manifest, snapshot, checkpoint, materialized authority, and
content-derived durable-root identity against the current trusted carrier root.

Generations 2+ live only under the dedicated live namespace.

## Crash recovery

A crash may occur after the next segmented durable root becomes durable but
before carrier successor publication completes.

Recovery accepts only the exact one-generation-ahead case where:

- the live durable root generation is current carrier generation + 1;
- its `previous_root_sha256` equals the carrier's active segmented root;
- the completed staged generation verifies;
- the appended record digest and length equal the current durable primary
  record.

The durable-root publish is replayed idempotently and the carrier successor is
then published. Any wider or conflicting divergence holds closed.

## Paid-unreservable obligations

When payment is confirmed but inventory cannot be reserved because the pool is
sold out or insufficient, the durable paid-unreservable obligation is located
by its server-produced obligation ID and exact payment key. That obligation is
then published through the same segmented-root and carrier-successor path.

No refund or alternate fulfillment authority is granted.

## Terminal closeout

Payment-keyed terminal closeout now runs through a wrapper that:

1. requires the server-owned carrier authority before an apply closeout;
2. executes the existing durable terminal closeout engine;
3. reads the payment key from the server-derived confirmed state;
4. performs a zero-unit carrier history refresh.

A duplicate terminal closeout can therefore repair a missing carrier refresh
without replaying inventory consumption, signing, or transaction broadcast.

## Activation boundary

The source contract now reports:

```text
history_carrier_successor_publication_mounted=true
history_carrier_activation_ready=true
```

Those fields mean only that the source lifecycle boundary is complete.

The following remain independently gated and are unchanged by this work:

```text
runtime_enablement=false
apply_enablement=false
public_activation=false
transaction_broadcast=false
funds_movement=false
```

A valid server-owned
`VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_ROOT` remains required for mounted
mutation paths.

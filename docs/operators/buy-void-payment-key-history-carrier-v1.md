# Buy VOID bounded payment-key history carrier v1

Marker: `VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1`

Status: source/proof-only current-main carrier. It is not mounted into the Buy
VOID runtime, dispatcher, PostgreSQL store, HTTP routes, services, startup,
wallet/signer path, broadcaster, treasury path, or public activation surface.

## Purpose

This gate carries forward the bounded authenticated-index design from historical
draft #1461, but removes its stale dependency assumptions.

The current carrier binds three accepted current-main authorities:

1. full 256-bit `payment_key_sha256` identity;
2. the read-only payment-key history reconciliation merged through #1650; and
3. the current `VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1` generation that owns the
   exact durable record bytes.

PostgreSQL remains dispatcher concurrency/lease/audit authority. It is not the
lifetime authenticated payment-history authority.

## Bounded index

The carrier retains the reviewed #1461 mechanics:

- 8 KiB content-addressed pages;
- 16-way path-compressed Patricia traversal;
- maximum index depth 64;
- maximum 65 page reads per lookup;
- 56 exact leaf entries per page;
- maximum 79 newly published pages for one insertion;
- authenticated membership and absence;
- exact duplicate-key/locator convergence; and
- conflicting locator rejection.

The locator is now explicitly rooted in the current segmented durable-root
generation:

```text
segmented_durable_root_sha256
segment_id
segment_sha256
byte_offset
byte_length
record_sha256
```

The exact located bytes must end in one JSONL newline, match the locator digest,
decode as fatal UTF-8 JSON, and contain the indexed `payment_key_sha256`.

## Current durable records

One payment key may be committed from either accepted current journal record:

- `void_buy_void_inventory_reservation_v1`; or
- `void_buy_void_paid_unreservable_obligation_v1`.

The carrier commit requires the supplied record object to be byte-equivalent,
after JSON parsing, to the exact located durable bytes.

Reservation commits advance:

- cumulative committed VOID units; and
- cumulative reservation count.

Paid-unreservable obligations do **not** claim reserved inventory. They advance a
separate cumulative obligation count while binding the requested VOID liability
amount in the committing record metadata.

## Reconciliation prerequisite

Every carrier commit requires a GREEN
`VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1` result.

That prerequisite means current fulfillment intent, reservation/obligation,
execution-attempt and saga-binding identities have already passed the #1650
read-only reconciliation boundary. The carrier does not create or repair those
records.

## Carrier root

Each successor root binds:

- predecessor carrier root;
- presale pool ID;
- exact current segmented durable-root SHA-256;
- segmented store generation;
- current history-reconciliation fingerprint;
- payment-index root;
- cumulative committed VOID units;
- cumulative reservation count;
- cumulative paid-unreservable obligation count;
- committing record kind;
- committing payment key; and
- committing record VOID amount.

The transaction-intent object binds the same state plus the exact record locator
and bounded set of newly published page digests.

## Threat-model limits

This local authenticated carrier does not claim:

- coordinated whole-host rollback detection;
- chain-side fulfillment uniqueness;
- payment-confirmation authority;
- runtime activation;
- automatic retry; or
- PostgreSQL lease/dispatcher authority.

Chain-2050 fulfillment uniqueness remains a separate chain-side fact. A
coordinated rollback of all local carrier and durable-root authority remains
outside this local-storage proof and requires a separately accepted external or
chain anchor.

## Authority boundary

```text
runtime_integration=false
credential_access=false
wallet_access=false
rpc_call=false
signing=false
transaction_broadcast=false
automatic_retry=false
money_movement=false
```

A later mount/integration gate is required before this source can affect any live
Buy VOID execution path.

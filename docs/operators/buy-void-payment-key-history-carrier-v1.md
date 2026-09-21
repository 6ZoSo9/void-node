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
- 46 exact leaf entries per page;
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

`byte_offset` is the absolute offset in the exact materialized JSONL generation,
not an untrusted segment-local pointer. The carrier verifies the selected
`segment_id` and `segment_sha256` against the exact manifest bound by the
trusted durable root and rejects any range that crosses that segment boundary.

The only future mount-eligible planner is
`planBuyVoidHistoryCarrierCommitV1`. It uses
`verifySegmentedJsonlDurableRootMaterializedAtUseV1` and reads the record through
its pinned-generation bounded reader. Caller-supplied record bytes and
caller-supplied record objects have no mount authority. The current reader
ceiling is exactly 1,048,576 bytes, and the carrier's located-record ceiling is
aligned to that bound.

The exact bytes must end in one JSONL newline, match the locator digest, decode
as fatal UTF-8 JSON, and contain the indexed `payment_key_sha256`. The canonical
planner then derives the record kind from those bytes and requires an exact
match to one current reservation or paid-unreservable-obligation record loaded
from the server-controlled Buy VOID runtime root.

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

Merged #1650 is the accepted source of the payment-keyed identity invariants,
but the carrier does **not** run its lifetime-wide reconciliation scan on every
online commit. Doing so would violate this lane's bounded-history contract.

Instead, the canonical at-use path re-applies the #1650 identity invariants to
the selected payment through bounded
`VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1`: exact fulfillment intent,
reservation/obligation, attempt sequence, confirmation/closeout binding, and
journal-specific fingerprints. Caller-supplied reconciliation or projection
receipts have no mount authority.

The index/root binds the current bounded per-payment projection fingerprint for
the committing payment key. That projection includes the exact fulfillment
intent record SHA-256 and a deterministic fingerprint of the complete validated
state for every observed attempt, so changes to payment verification,
confirmation block/hash/count, provider observations, or failure details change
the carrier-visible lifecycle fingerprint. Inventory-consumption closeout records
are also checked against their deterministic consumption fingerprint/ID and
their exact file SHA-256 is included in the projection.

The projection reads at most ten deterministic attempt slots, and every
reservation/obligation/attempt-event/closeout JSON read uses the same bounded,
no-follow, same-inode stability contract; it does not delegate attempt reads to
the older unbounded journal reader. A separate offline/global reconciliation
gate may be run for audit or launch acceptance, but it is not hidden inside each
bounded carrier lookup/update.

## Carrier root

Each successor root binds:

- predecessor carrier root;
- presale pool ID;
- exact current segmented durable-root SHA-256;
- segmented store generation;
- current per-payment history-projection fingerprint;
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

The canonical at-use path performs bounded filesystem reads only. It does not
write the segmented store, durable-root slots, materialized generation, carrier
pages, runtime state, or dispatcher state.

```text
filesystem_read_at_use=true
filesystem_write=false
verified_bytes_helper_mount_authority=false
caller_supplied_record_bytes_mount_authority=false
caller_supplied_record_object_mount_authority=false
caller_supplied_history_reconciliation_mount_authority=false
current_journal_record_match_required=true
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

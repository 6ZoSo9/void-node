# Buy VOID bounded segmented history successor v1

Marker: `VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1`

Issue: #1783

Status: source-only storage producer. It is not mounted into reservation,
paid-unreservable-obligation, terminal-closeout, dispatcher, or public Buy VOID
runtime paths.

## Purpose

A new reservation or paid-unreservable obligation adds one new canonical
primary record to Buy VOID payment history. The carrier successor cannot safely
refer to that record until a new segmented durable-root generation exists and
is proven append-only against the exact predecessor.

This producer stages exactly one new JSONL record into the next generation and
materializes the existing segmented-storage proof objects required by the
durable-root publisher:

- next manifest/snapshot;
- next checkpoint;
- exact next materialized authority;
- append-only checkpoint witness; and
- `SegmentedJsonlDurableRootPublishInputV1`.

It deliberately does **not** publish the durable root itself and does not mutate
the carrier authority.

## Dedicated live namespace

The accepted legacy migration namespace remains immutable.

The production mount must initialize a separate live segmented-history durable
root with the same accepted generation-1 content/root identity, then advance
only that live namespace. This preserves legacy alias replay, which continues
to pin the original migration durable-root directory and generation-1 SHA.

## Bounded launch contract

V1 admits a predecessor materialized size of at most:

```text
16 MiB
16777216 bytes
```

The producer performs the expensive append-only prefix witness scan only inside
that explicit ceiling. It therefore fails closed rather than introducing an
unbounded lifetime-history scan.

This is a launch-safety bound, not an assertion that V1 is the final scalable
history-storage design. A later storage generation may replace this producer
with a bounded incremental witness writer before the ceiling is approached.

Each generation appends exactly one canonical JSON object plus its terminating
newline. The segmented target remains 8 MiB and the existing 1 MiB record
ceiling remains authoritative.

## Atomic generation visibility

The producer builds the successor under a private sibling staging directory.
Only after the materialized file, segmented store, checkpoint, witness, and
stage metadata are fully fsynced is the staging directory atomically renamed to
the deterministic generation directory.

A crash before rename leaves no partially visible canonical generation. An
orphan staging directory is non-authoritative.

A complete canonical generation can be re-read and returned as an exact
`duplicate` while the durable-root predecessor is still current.

## Durable-root publication boundary

Staging returns `publish_input` but reports:

```text
durable_root_publish_performed=false
```

The existing `publishSegmentedJsonlDurableRootV1` remains the only durable-root
publication authority.

After that publisher advances the current root, callers must continue forward
using the published root. They must not attempt to restage the old predecessor.

`materializeBuyVoidHistorySegmentedSuccessorLocatorV1` accepts the published
root only when generation, predecessor, checkpoint, snapshot, manifest,
materialized authority, materialized hash, and append-only witness all match
the completed stage. It then binds the new record locator to the published
durable-root SHA.

## Lifecycle split

This producer is required only for primary-record insertion:

- reservation;
- paid-unreservable obligation.

Terminal closeout does not append a new primary record. Its carrier transition
uses the current segmented durable root and the existing
`planBuyVoidHistoryCarrierRefreshV1` zero-unit history refresh.

The later #1783 mount must preserve ordering:

1. canonical reservation/obligation becomes durable;
2. this bounded segmented successor is staged;
3. existing durable-root publisher advances the live history root;
4. carrier commit plan is built from the exact published record locator;
5. #1787 successor-publication gate publishes the carrier generation;
6. only then may the lifecycle transition be reported complete.

A crash at any boundary must resume from durable state without repeating an
economic mutation.

## Authority boundary

This PR adds no:

- legacy migration namespace mutation;
- carrier-root mutation;
- carrier successor publication;
- lifecycle mount;
- runtime/apply/public activation;
- service action;
- credential content access;
- wallet or signer access;
- RPC call;
- transaction signing or broadcast;
- Chain-2050 write;
- inventory mutation;
- treasury/liquidity action; or
- funds movement.

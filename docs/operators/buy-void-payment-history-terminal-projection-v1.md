# Buy VOID payment-history terminal projection v1

Marker: `VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1`

Status: source-only, read-only terminal completion projection. This gate does not
modify the accepted payment-history carrier, public request state, saga state,
runtime configuration, credentials, wallets, Chain-2050, inventory funding, or
funds.

## Purpose

The bounded payment-key history carrier accepted in #1653 intentionally stops
at durable `inventory_consumed`. That is the correct custody boundary, but it
does not by itself prove that the later public fulfilled sidecar exists or that
the fulfillment saga reached terminal `closed`.

This projection adds those two later facts without creating a second history
root.

A terminal projection is emitted only when all three layers agree:

1. the accepted carrier entry is current for the selected payment key;
2. the deterministic terminal public-closeout sidecar exactly matches the
   persisted terminal plan; and
3. the selected saga has a bounded, valid hash chain whose final event is the
   exact `closeout_committed` event for that plan.

The resulting lifecycle label is:

```text
public_fulfilled_terminal_closed
```

## Carrier prerequisite

The input carrier root is fully verified and the full 256-bit
`payment_key_sha256` is looked up through the content-addressed index.

The current bounded payment-history projection must report:

```text
primary_kind=reservation
lifecycle_state=inventory_consumed
```

The carrier leaf's `payment_history_fingerprint_sha256` must equal the current
projection fingerprint. A stale carrier entry cannot be promoted by later
terminal artifacts.

This module does not mutate the carrier root or create a successor root.

## Terminal plan binding

The deterministic terminal plan is selected by the already-authenticated
execution attempt:

```text
<root>/buy-void-saga-terminal-closeout-v1/attempts/<attempt_id>/plan.json
```

The projection resolves that selector through the existing path contract but
opens the plan itself with a bounded, no-follow, same-inode stable read. It
recomputes the persisted plan fingerprint from those exact bytes before using
the plan.

This projection additionally binds the plan to the accepted payment history:

- request ID;
- instruction ID;
- canonical payment identity;
- reservation ID;
- execution attempt ID;
- delivery address and amount;
- Chain-2050 delivery transaction;
- inventory-consumption ID and fingerprint; and
- the base public fulfilled event.

It independently recomputes:

- the terminal inventory fingerprint;
- the terminal closeout ID; and
- the public terminal-event fingerprint.

The confirmed-state ID/fingerprint and server-policy fingerprint therefore
participate in the recomputed terminal identities without adding a global
confirmed-state scan to this bounded per-payment gate.

## Public fulfilled evidence

The primary public terminal evidence is the deterministic sidecar:

```text
<request_dir>/operator-event-terminal-closeout-<request_id>-<closeout_id>.json
```

Its canonical content must exactly equal the terminal plan's public-closeout
event and its public-event fingerprint must recompute correctly.

This gate deliberately does not scan the shared `operator-events.jsonl` file.
That file can contain history for many requests and is not needed when the
deterministic terminal sidecar is present and exact.

## Bounded closed-saga evidence

Saga evidence is read directly from one selected saga:

```text
<root>/buy-void-crash-consistent-saga-runtime-v1/sagas/<saga_id>/events
```

No saga-store constructor is used, because the normal runtime store may create
missing private directories.

Before any event body is parsed, the projection requires:

- at most 128 total directory entries;
- 1 through 64 canonical event files;
- only canonical event filenames or recognized runtime temporary filenames;
- direct, non-symlink event files;
- gap-free sequence filenames;
- at most 1 MiB per event file; and
- at most 8 MiB total canonical event bytes.

The directory is consumed incrementally with `opendirSync/readSync`; the gate
stops at entry 129 rather than first materializing an unbounded directory
listing.

The accepted saga validator and fold functions then revalidate every event,
event ID, binding, hash-chain predecessor, sequence, timestamp ordering, fencing
token, and state transition.

The folded state must be terminal `closed`, receipt status must remain
confirmed, and the final event must be the exact `closeout_committed` event
for the plan's attempt, transaction, and closeout ID with both terminal flags
true.

## Authority boundary

```text
carrier_root_mutation=false
history_carrier_successor_created=false
shared_operator_event_journal_scan_required=false
filesystem_write=false
saga_mutation=false
public_request_mutation=false
runtime_activation=false
automatic_retry=false
credential_access=false
wallet_access=false
rpc_call=false
signing=false
transaction_broadcast=false
inventory_funding=false
treasury_or_liquidity_action=false
money_movement=false
```

The `request_dir` and page reader are composition inputs, not future caller
mount authority. Content-addressed carrier pages are still digest-verified
against the accepted carrier root.

## Threat-model limits

This projection authenticates the relationship among current local carrier
truth, the deterministic public sidecar, persisted terminal plan, and bounded
local saga history.

It does not claim coordinated whole-host rollback detection or an external
anchor. It also does not create new Chain-2050 fulfillment uniqueness
authority; that remains a chain-side fact.

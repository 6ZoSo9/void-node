# Buy VOID crash-consistent fulfillment saga v1

Marker: `VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1`

Decision:

```text
SOURCE_ONLY_CRASH_CONSISTENCY_CONTRACT_READY_RUNTIME_INTEGRATION_NOT_AUTHORIZED
```

## Why this is a hard lane

The existing Buy VOID stack already has request discovery, payment claiming,
inventory reservation, execution-attempt journaling, native transaction
preparation, signing/broadcast adapters, receipt reconciliation, confirmed
closeout, and a bounded orchestrator.

The remaining system-level risk is not another missing validator. It is the gap
between those components when a process crashes, two workers race, or a provider
times out after receiving a signed transaction.

A timeout after submission is fundamentally ambiguous. The transaction may have
been accepted even though the caller did not receive a response. Blindly retrying
can send the same customer twice, consume a second nonce, or create contradictory
local records. A safe automatic-fulfillment system must survive that uncertainty
without treating absence of a response as evidence that no broadcast occurred.

This lane introduces a durable saga and fencing contract for that boundary.

## Core model

Each saga is bound to exactly one:

- public Buy VOID request ID;
- canonical payment identity;
- request-key SHA-256;
- payment-key SHA-256;
- delivery address;
- VOID amount;
- chain ID `2050`; and
- inventory pool.

The saga ID is a SHA-256 content address of that complete binding:

```text
voidbvfsg1_<64 lowercase hex>
```

The committed example is:

```text
voidbvfsg1_f5aaa85768e898a0c49e44d8da17b6bb064cf959cf25b3cd7909530e87738886
```

## Append-only event chain

Every state change is a content-addressed event:

```text
voidbvfsge1_<64 lowercase hex>
```

Events contain:

- a contiguous zero-based sequence;
- the previous event ID;
- a canonical UTC timestamp;
- a monotonically nondecreasing fencing token;
- the immutable saga binding;
- one closed event payload; and
- the complete all-false execution-authority boundary.

Changing any event field changes its event ID. Reordering, deleting, duplicating,
or inserting an event breaks the sequence or hash chain.

## State machine

The allowed forward path is:

```text
initialized
  -> claimed
  -> inventory_reserved
  -> attempt_reserved
  -> transaction_prepared
  -> broadcast_intent_committed
  -> broadcast_not_attempted | broadcast_unknown | broadcast_accepted
  -> receipt_confirmed | receipt_reverted
  -> closed
```

`terminal_hold` may stop a nonterminal saga when evidence cannot be safely
resolved.

The transaction hash and nonce are fixed in `transaction_prepared` before any
broadcast result can be recorded. All later broadcast, receipt, and closeout
events must bind the same attempt and transaction hash.

## Broadcast ambiguity rule

After a durable `broadcast_intent_committed`, `broadcast_unknown`, or
`broadcast_accepted` state is recovered, the only next action is:

```text
reconcile_possible_broadcast
```

Before the broadcast adapter is invoked, the supervisor appends and fsyncs a
deterministic write-ahead broadcast intent bound to the saga, attempt, and exact
prepared transaction hash. A crash before, during, or after the adapter call
therefore recovers to reconciliation rather than another broadcast.

The supervisor never selects `execute_prepared_transaction` from any state in
which a broadcast may have occurred. There is no automatic retry flag anywhere
in the record.

A reconciliation may record:

- the already-prepared transaction as visible/accepted;
- a confirmed receipt for that exact hash; or
- a reverted receipt for that exact hash.

A different transaction hash is rejected. A confirmed receipt is required
before closeout. A reverted receipt terminates the saga for review rather than
silently creating a second attempt.

## Crash consistency

The filesystem store uses:

- direct private directories;
- direct regular JSON files only;
- exclusive lock files carrying PID, nonce, and acquisition metadata;
- dead-owner stale lock reclamation plus bounded legacy-lock aging;
- write-to-new temporary files;
- file `fsync`;
- atomic rename; and
- parent-directory `fsync`.

Incomplete temporary files are ignored only when their names match the exact
atomic-write temporary-file grammar and they are direct regular files. Temporary
symlinks, malformed temporary names, and symlinked or malformed event entries are
rejected. A dead process cannot leave a lock file that permanently blocks
recovery.

A restart reconstructs the complete state by validating and folding every event.
No mutable summary file is trusted as the source of truth.

## Lease and fencing safety

Every append requires an active per-saga lease containing:

- owner ID;
- expiration;
- fencing token; and
- released state.

A second worker is held while a lease is active. After expiration, a takeover
increments the fencing token. The stale worker cannot append with its older
token even if it resumes after the new worker starts.

This prevents a paused process from writing an obsolete transition after another
worker has recovered the saga.

## Supervisor behavior

`runSagaSupervisorTickV1(...)`:

1. derives the saga ID from the immutable binding;
2. acquires the lease;
3. recovers or initializes the event chain;
4. derives the next action from server state;
5. returns a dry-run decision unless explicitly applied;
6. requires the saga-level and exact action-level confirmations;
7. for broadcast execution, appends and fsyncs a deterministic write-ahead intent;
8. invokes one injected stage adapter;
9. converts only a closed sanitized result into the next event;
10. appends the result under the current fencing token; and
11. releases the lease.

The engine does not accept arbitrary caller-selected next states.

## Source-only authority boundary

This lane implements orchestration state and local crash consistency only. The
module imports Node cryptography, filesystem, and path APIs. It does not import
HTTP, HTTPS, child processes, wallet libraries, or RPC clients.

It performs no:

- payment-provider request;
- chain RPC request;
- credential read;
- wallet access;
- transaction signing;
- transaction broadcast;
- raw signed transaction persistence or output;
- inventory decrement;
- public request mutation;
- service restart;
- deployment; or
- money movement.

Stage adapters remain injected dependencies. Connecting them to live claiming,
reservation, signing, broadcast, receipt, or closeout components requires a
separate reviewed integration lane and separate runtime authorization.

## Verification coverage

The focused proof exercises:

- deterministic saga and event IDs;
- a complete closed eight-event fixture;
- append-only sequence and hash-chain validation;
- crash recovery after the external broadcast effect but before result append;
- durable write-ahead intent before any injected broadcast adapter call;
- restart recovery after `broadcast_intent_committed` and `broadcast_unknown`;
- prohibition on automatic rebroadcast;
- dead-owner stale lock reclamation;
- temporary-file symlink rejection;
- confirmed-receipt-before-closeout ordering;
- duplicate closeout rejection;
- conflicting transaction-hash rejection;
- stale lease-holder fencing;
- incomplete temporary-file tolerance;
- event symlink rejection;
- secret-key rejection;
- raw-signed-transaction rejection; and
- absence of network, credential, wallet, signing, broadcast, and money behavior.

Expected marker:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1_PROOF_GREEN
```

## Next architecture step

After this source contract is reviewed and merged, the substantial follow-on is
a runtime composition layer that maps existing Buy VOID pipeline outputs into
these saga events and lets the server—not the caller—construct each stage
command. Live execution, service enablement, wallet funding, signing, broadcast,
and automatic fulfillment remain separately authorized gates.

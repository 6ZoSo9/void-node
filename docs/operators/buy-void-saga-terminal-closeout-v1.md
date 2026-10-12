# Buy VOID saga terminal closeout v1

## Purpose

This source-only lane composes the existing confirmed-delivery journals with the crash-consistent Buy VOID saga's final action:

```text
receipt_confirmed
  -> closeout_confirmed_delivery
  -> closeout_committed
  -> closed
```

It closes the remaining split-brain window between durable Chain-2050 confirmation, inventory-consumption evidence, the public fulfilled projection, and the terminal saga event.

The lane is reconciled without history rewrite onto exact PR #1017 head:

```text
cfd47940fdcc911b37072d8863a7d738c99f3e9f
```

It is not mounted into a runtime and is disabled by server policy unless explicitly configured.

## Source architecture

The lane is split into bounded review surfaces:

- server-controlled policy and fingerprinting;
- public types, constants, and authority declarations;
- private plan/public projection storage helpers;
- canonical-state and journal reconstruction; and
- the saga supervisor coordinator.

## Defects addressed

The existing confirmed-closeout module already writes duplicate-safe inventory-consumption and public-operator records. It did not, however, prove four requirements needed for the saga terminal boundary:

1. `confirmed_state_required: true` was declarative; automatic closeout did not resolve the completed canonical confirmed-state candidate and request index.
2. Automatic fulfilled events omitted the canonical confirmed-state ID and projection fingerprint.
3. The two durable closeout writes were not serialized by a request-scoped cross-process lock.
4. No coordinator recovered a crash after either closeout write and then appended exactly one saga `closeout_committed` event.

## Canonical confirmed-state gate

Closeout requires exactly one state returned by the repository's completed-state request resolver. That resolver validates:

- the confirmed-state completion marker;
- the candidate state;
- the request index;
- recomputed state and projection fingerprints; and
- exact completion/candidate/index identity agreement.

The terminal coordinator additionally binds the state to:

- the saga request and canonical payment identity;
- the confirmed execution attempt;
- the final delivery transaction hash;
- the delivery address and VOID amount; and
- the confirmed buyer, allocation, and fulfillment-receipt projections.

Missing, ambiguous, incomplete, corrupt, or mismatched confirmed-state evidence holds before closeout writes.

## Server policy

The caller supplies no closeout policy.

Server configuration provides:

- the parent economic-policy fingerprint;
- the fixed parent inventory pool ID; and
- the public request directory.

Environment controls:

```text
VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_ENABLED=1
VOID_BUY_REQUEST_DIR=/absolute/server/controlled/path
```

The terminal policy fingerprint binds the parent economic policy, pool ID, and request-directory fingerprint. Apply requires the exact dry-run fingerprint echo.

## Durable ordering

The terminal adapter executes under both:

- the existing per-saga lease and fencing token; and
- a request-scoped crash-recoverable filesystem bakery lock.

The durable order is:

```text
1. deterministic terminal-closeout plan
2. inventory-consumption record
3. append-only public fulfilled event and deterministic sidecar
4. saga closeout_committed event
```

The first three steps are idempotent. If the process stops before step 4, the next explicitly confirmed invocation recovers the same plan and writes only missing projections before the saga append.

## Cross-request journal safety

`operator-events.jsonl` is shared by every Buy VOID request. Replacing the
whole file under a request-scoped lock is unsafe because two different
requests use different locks: both can read the same journal head and the
later rename can erase the other request's fulfilled event.

Terminal closeout therefore publishes exactly one bounded JSON line through
one durable `O_APPEND` write syscall and never rebuilds or renames the shared
journal. Same-request duplicate and conflict checks remain inside the request
lock. Different requests can close concurrently without losing either event.

## Stable closeout plan

The private plan binds:

- saga, request, attempt, and reservation IDs;
- final delivery transaction hash;
- canonical confirmed-state ID and projection fingerprint;
- server-policy fingerprint;
- inventory-consumption ID and fingerprint; and
- public-event fingerprint.

The plan is persisted before inventory or public projection writes. Later changes in the public effective status therefore cannot alter the closeout identity during recovery.

## Inventory semantics

The fixed-price inventory journal commits availability at reservation time. Terminal closeout does not release or subtract the reservation a second time. It writes an immutable consumption record proving that the already committed reservation became a fulfilled allocation.

The augmented consumption evidence includes:

- canonical confirmed-state ID and fingerprint;
- saga and closeout IDs; and
- a terminal-consumption fingerprint.

The original reservation record remains immutable.

## Public fulfilled projection

The public operator event includes:

- canonical confirmed-state ID and projection fingerprint;
- saga and closeout IDs;
- inventory-consumption ID, base fingerprint, and terminal fingerprint;
- final delivery transaction hash; and
- existing buyer-fulfilled truth flags.

The operator journal is read through the existing closed validation boundary
and extended through durable append-only publication under the request lock.
Every existing row must be valid JSON object data. Symlinked, oversized, or
malformed request and event files fail closed.

The public base request file remains immutable.

## Crash recovery proof

The focused proof constructs real repository-backed:

- verified payment and fulfillment claim;
- inventory reservation;
- execution attempt, preparation, broadcast, and confirmation;
- completed confirmed-state candidate, indexes, and completion marker;
- public request and payment-verified event; and
- saga through `receipt_confirmed`.

It then injects termination after:

1. terminal plan persistence;
2. inventory consumption; and
3. public fulfilled projection before saga append.

The final retry proves:

- one terminal plan;
- one inventory-consumption record;
- one public fulfilled event;
- one saga `closeout_committed` event; and
- terminal saga state `closed`.

A separate two-process run proves that concurrent explicit closeout attempts
for the same request leave the same unique terminal projections. An additional
two-process run closes two different requests against one shared operator
journal and proves that both fulfilled events, both inventory-consumption
records, and both saga closeout events survive.

Expected marker:

```text
VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1_PROOF_GREEN
```

## Authority boundary

This lane authorizes source and test filesystem mutations only.

It does not authorize or perform:

- runtime route mounting or enablement;
- live public-request mutation;
- RPC calls or receipt polling;
- credential, key, signer, or wallet access;
- signing, transaction submission, or rebroadcast;
- release or reassignment of inventory reservations;
- base request or base reservation mutation;
- deployment or service restart; or
- fund movement.

Promotion, merge, runtime composition, and live invocation remain separate explicit gates.

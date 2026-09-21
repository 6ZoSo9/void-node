# Buy VOID dispatcher guarded-broadcast apply v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1`

Status: source-only bounded worker composition. This module is not mounted as an
HTTP route or background worker and performs no work unless a trusted caller
invokes it with an existing dispatcher lease and PostgreSQL pool.

## Purpose

The repository already has:

- a canonical dispatcher claim/lease contract;
- a read-only guarded-broadcast context that proves the exact server-derived
  stage, durable identities, saga head and required confirmations;
- a fixed full-runtime dependency bootstrap;
- a non-replayable PostgreSQL lease session; and
- a lease-bound guarded-broadcast coordinator whose database-time lease sample
  is fenced at the write-ahead intent append boundary.

This module composes those existing contracts into one bounded
`guarded_broadcast_only` worker action.

## Fixed execution sequence

The caller supplies only:

```text
root_dir
dispatcher lease
PostgreSQL pool
```

The module then:

1. requires both existing full-runtime enable flags;
2. reconstructs the canonical full-runtime policy from server environment;
3. creates the canonical PostgreSQL dispatcher store from the supplied pool;
4. builds the fixed guarded-broadcast dispatcher context;
5. requires exact lease, request and full-runtime policy identity continuity;
6. invokes the fixed production dependency bootstrap;
7. verifies bootstrap identity and that composition itself performed no
   credential read, RPC, signing, guard write or broadcast;
8. invokes the fixed non-replayable guarded-broadcast lease runner using the
   context's exact server-derived confirmations and request fingerprint; and
9. preserves a known coordinator result when PostgreSQL completion is
   unconfirmed instead of replaying the action.

The module does not call generic full-runtime `apply:true`. A generic parent
apply could re-select a later stage after the guarded-broadcast context was
reviewed. This worker executes only the already-proven guarded-broadcast lane.

## Authority boundary

The input does not accept caller-selected:

- stage;
- runtime/server policy;
- confirmation strings;
- signer;
- broadcaster;
- submission guard;
- RPC URL; or
- dispatcher publish/renew action.

When actually invoked after every gate is enabled, this worker may read the
fixed wallet credential, sign, call the broadcaster and move funds because
those are intrinsic guarded-broadcast effects. It still cannot perform
inventory closeout or public fulfilled closeout.

Dispatcher result publication is deliberately **not** performed here. A
successful guarded-broadcast outcome is not terminal fulfillment: accepted or
unknown submission requires reconciliation, and definitive no-submission may
permit a separately confirmed retry. Publishing the dispatcher job at this
stage would incorrectly terminalize later work.

## Failure semantics

Unexpected context/bootstrap/session errors are converted into bounded HOLD or
reconciliation-required results. Raw driver or credential exception text is not
returned.

The wrapper preserves the coordinator's exact external-effect vocabulary:
`broadcast_call_performed`, `transaction_broadcast_accepted`,
`money_movement_performed`, and `money_movement_may_have_occurred`. It never
equates a provider-call attempt with a proven accepted transaction. If the
non-replayable session loses the callback result after worker execution began,
the wrapper conservatively reports that an external effect may have occurred.

A non-replayable session result whose callback returned but whose PostgreSQL
completion is unconfirmed retains the nested coordinator result and requires
reconciliation. It is never automatically replayed.

A completed lease session whose coordinator returns a failed decision also
preserves reconciliation truth at the outer wrapper. If the coordinator marks
reconciliation required, accepted broadcast, performed movement, or possible
movement, the wrapper returns outer `status: "reconciliation_required"` while
retaining the exact nested coordinator. Only failed coordinator decisions with
no such post-effect truth remain ordinary `held` results.

## Remaining gates

This source contract does not:

- mount a worker loop or route;
- construct a production PostgreSQL pool;
- claim or renew a dispatcher lease;
- publish a dispatcher terminal result;
- automate broadcast reconciliation;
- automate receipt reconciliation;
- automate terminal closeout; or
- authorize deployment or service activation.

Those remain separate reviewed gates.

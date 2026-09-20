# Buy VOID payment-keyed guarded broadcast v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1`

Status: source-only write-ahead broadcast composition. No runtime route is mounted.

## Purpose

This lane advances one already-prepared payment-keyed fulfillment through the
first external-submission boundary without weakening the crash-consistent saga.

The invariant is:

```text
exact prepared hash durable
  -> deterministic exact-request re-sign
  -> saga broadcast_intent_committed fsynced
  -> durable submission-guard claim
  -> optional captured trusted submission veto
  -> one injected broadcaster call
  -> private external-outcome evidence
  -> execution-attempt projection
  -> saga outcome event
```

No guard claim or broadcaster call can happen before
`broadcast_intent_committed`.

## Durable reconstruction

The coordinator accepts one server-selected `attempt_id` and reconstructs:

- the exact fulfillment intent;
- the exact inventory reservation;
- the payment-keyed wallet/nonce reservation;
- the private preparation-custody record containing the exact nonsecret
  custodian request;
- the execution-attempt prepared hash; and
- the crash-consistent saga.

Current server-policy and transaction-preparation fingerprints must still match
the durable nonce reservation.

The custody request must still bind the canonical fulfillment contract, buyer
recipient, VOID amount, payment identity/key, calldata, nonce/fee plan,
inventory reservation, and unsigned-transaction fingerprint.

## Deterministic signed-byte recovery

Apply re-signs the exact durable custodian request through the injected signer.

The resulting:

- signer address;
- final transaction hash; and
- SHA-256 of the raw signed bytes

must exactly match the preparation-custody record.

The raw signed transaction then exists only in memory long enough to pass into
the already-reviewed payment-keyed guarded broadcaster. It is never persisted
or returned.

A crash after re-sign but before the saga intent is safe: no guard claim or
broadcaster call has happened, and the exact request can be re-signed again.

## Write-ahead broadcast intent

The existing saga supervisor remains the authority for
`execute_prepared_transaction`.

It appends and fsyncs the deterministic `broadcast_intent_committed` event
before invoking the coordinator's adapter. The adapter asserts the recovered
state and intent ID before it can call the payment-keyed broadcaster.

A crash after that point always leaves the saga in a reconciliation state.
This coordinator will not execute again from
`broadcast_intent_committed`, `broadcast_unknown`, or
`broadcast_accepted`.

## Guarded external submission

Inside the post-intent adapter the merged payment-keyed broadcaster:

1. revalidates the exact request and signed transaction;
2. claims the durable submission guard once;
3. calls the injected broadcaster at most once;
4. releases the claim only for a provider-certified definitive
   no-submission result; and
5. classifies the result as accepted, unknown, or definitively not submitted.

No automatic retry is enabled.

## Captured post-claim admission

The coordinator accepts the existing `before_external_submission` callback in
its trusted server dependencies and captures it once before its first await.
A present non-function or throwing property read returns a fixed input HOLD
before saga loading, signing, intent recording, or guard acquisition. Undefined
means omitted; existing callers retain their previous behavior. A valid callback
is not invoked during preview, failed confirmation, missing-signer handling, or
a refused guard claim. Later deletion/replacement of the dependency cannot
replace the callback already selected for the invocation.

The captured callback is forwarded to the actual custodian call, not invoked at
an earlier preview or fault-injection point. The custodian calls it only after
claim acquisition, with its frozen six-field nonsecret transaction identity.
Only literal true permits submission. False, non-boolean values, exceptions,
rejections, or the existing five-second deadline veto submission and retain the
claim. The coordinator preserves the resulting reconciliation requirement and
does not fabricate provider-certified no-submission evidence, release the guard,
persist an accepted outcome, or project a completed delivery. Late callback
settlement cannot resume broadcasting. A later coordinator invocation encounters
the existing reconciliation state rather than signing or submitting again.

This is a veto plumbing change, not a dispatcher execution implementation.
Signing and the durable saga intent precede this veto and are not protected by
it. A fixed caller must still supply lease/saga/custody/policy fences at those
separate effect boundaries and own any pending database work after timeout.
This coordinator neither cancels that work nor keeps a dispatcher connection
alive for it. The accepted lease-session wrapper must perform that ownership in
the eventual fixed caller. Omission or a permissive callback does not establish
lease validation. A callback is trusted code, not a public capability, and its
captured reference does not freeze the state of its closure.

The existing coordinator proof adds 28 named cases, including success, strict
true admission, rejection/exception, single accessor capture, dependency drift,
invalid configuration, precondition non-invocation and two real timeout/late
settlement schedules. Existing tests remain. The source uses the existing
custodian callback type and existing deadline; there is no second timer in the
coordinator. Proofs use a fixed public synthetic key and injected observations,
not production credentials or network submission. Hosted checks bind the exact
source head, build, run both old and new proof markers, and compile all Buy VOID
proofs with the broader integration command.

## Prepared-state revalidation around signer waits

The coordinator now takes a detached private snapshot of the admitted attempt,
intent, inventory reservation, nonce/fee plan, custody record, evidence, policy
fingerprints and saga binding/state. The saga state includes its existing
history-head fields; the complete event array is not cloned again. No new
public input, optional permission callback or raw signed transaction field is
introduced.

The existing synchronous readers and validators run again immediately before
calling the injected signer's `get_address` and `sign_transaction` methods.
Each sample must match the detached snapshot and the original policy
fingerprints. The exact confirmations and apply flag must remain valid; policy
and authority are checked again after the last reader/snapshot operation.
Consequently, a change observed after an awaited address read cannot still
reach transaction signing. A final sample after signing, the existing fault
hook and the clock callback must pass before entering the saga supervisor.
A supplied reader exception or failed reconstruction is a HOLD, not evidence
that the previous state remains current. Field ordering alone is not a change.

The original adapter methods are validated and captured with their receiver
before wrapping; malformed methods return the existing dependency-required
HOLD without claiming delegation. The custody signer sees calls to a wrapper
even when that wrapper refuses before delegating. The coordinator therefore records actual address/sign
function delegation separately and uses those counters on a revalidation
HOLD. A failed pre-address check reports neither wallet access nor signing; a
failed pre-sign check reports the earlier address access but no signing. A
post-sign HOLD preserves that signing happened. These HOLDs write no saga
intent, claim no submission guard, produce no accepted evidence or projection,
and require fresh reconciliation rather than an automatic retry.

This is **observed prepared-state continuity**, not complete dispatcher
execution or an atomic cross-store fence. Sequential filesystem reads do not
freeze other writers. The sample before supervisor entry does not hold the
saga append lock, does not check a PostgreSQL lease, and does not prevent a
writer from changing state after the sample. A trusted signer can also perform
internal asynchronous work after its method is called. The remaining fixed
execution composition must enforce the database-time lease and exact saga
predecessor at the actual durable append/submission boundaries and own pending
queries. Unobserved ABA changes or coordinated rollback are not detected by a
snapshot equality check. Existing signer validation, write-ahead intent,
post-claim veto, accepted/unknown outcome persistence and no-rebroadcast rules
remain in force; no late lease check is added that discards a known external
outcome.

The existing coordinator proof adds 47 cases: ten independent state/policy
changes at each of three observed cuts, unchanged and reordered-field controls,
non-executing preconditions, delegated signer failures, revoked confirmation or
apply, a shared-record alias, post-sign hook/clock drift, snapshot failure,
invalid signer methods and captured-method/receiver controls.
The dedicated workflow requires the new marker/count alongside the accepted
28-case admission proof, production build and broad proof compilation. The
Precision verifier additionally requires omitted pre-sign checking, omitted
pre-supervisor checking and an aliased baseline mutant to fail discriminating
assertions. This source/proof change performs no production signing or RPC.

## Durable evidence ordering

A projectable external outcome is persisted in this order:

```text
external outcome
  -> private broadcast-evidence journal
  -> execution-attempt/broadcast-outcome projection
  -> saga result event
```

The generic evidence journal now records
`submission_call_performed` separately from
`submission_may_have_occurred`.

That matters for payment-keyed delivery: a provider function may be invoked and
still prove that no submission occurred.

## Definitive no submission

For a provider-certified no-submission result:

- the submission guard is released;
- evidence stores `submission_call_performed=true` when the broadcaster was
  invoked;
- evidence stores `submission_may_have_occurred=false`;
- the execution attempt remains `prepared`;
- the saga appends `broadcast_not_attempted`;
- the folded saga state keeps
  `broadcast_call_may_have_occurred=false`; and
- a later retry is possible only through another explicitly confirmed
  `execute_prepared_transaction` call.

Automatic retry remains false.

## Unknown submission

An ambiguous provider result:

- keeps the guard claimed;
- persists `unknown` evidence;
- records canonical `record_broadcast_unknown` execution/outcome state;
- appends saga `broadcast_unknown`; and
- requires reconciliation.

This coordinator never rebroadcasts from that state.

## Accepted submission

An accepted result:

- keeps the guard claimed;
- requires the returned transaction hash to equal the durable prepared hash;
- persists `accepted` evidence;
- records canonical `record_broadcast_accepted` execution/outcome state;
- appends saga `broadcast_accepted`; and
- requires later receipt reconciliation.

This lane does not wait for a receipt.

## Crash windows

The focused proof covers:

1. after exact re-sign and before write-ahead intent;
2. after `broadcast_intent_committed` but before guard claim;
3. after the external outcome but before evidence persistence;
4. after evidence persistence but before execution projection; and
5. after execution projection but before the final saga event.

After any crash in which the write-ahead intent exists, a retry is routed to
reconciliation and the guarded broadcaster is not called again.

## Generic saga/evidence semantic correction

Two shared contracts are narrowed to represent provider-certified
no-submission truthfully:

- saga `broadcast_not_attempted.broadcast_call_performed` is now a boolean,
  not forced to `false`; and
- broadcast-evidence `not_submitted.submission_call_performed` is now a
  boolean independent of `submission_may_have_occurred=false`.

The folded saga state still sets
`broadcast_call_may_have_occurred=false`, because the outcome proves no
submission occurred.

Legacy callers that report `false` remain valid.

## Explicit non-authority

This source lane does not:

- mount a runtime route or canonical parent action;
- read production credentials in proof;
- use a real wallet in proof;
- call live Chain-2050 RPC in proof;
- persist or return raw signed bytes;
- monitor a receipt;
- decrement inventory;
- mark a public request fulfilled;
- deploy or restart a service; or
- move real funds.

The next source gate is payment-keyed broadcast reconciliation: consume durable
intent/evidence plus broadcaster inspection, complete any missing
execution/saga projections without resubmission, and then hand the exact
accepted hash to the payment-keyed receipt verifier.

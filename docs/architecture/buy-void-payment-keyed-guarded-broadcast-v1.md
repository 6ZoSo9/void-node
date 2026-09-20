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

The detached baseline is captured before reading either signer method property.
A successful accessor that changes a shared record cannot advance that baseline;
the first state recheck rejects the change before actual signer delegation.
The original adapter methods are then validated and captured with their receiver
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
saga append lock and does not prevent a writer from changing state after the
sample. The standalone path has no PostgreSQL lease check; the separate
lease-session runner below adds sampled checks without changing this lock. A trusted signer can also perform
internal asynchronous work after its method is called. The remaining fixed
execution composition must enforce the database-time lease at the durable
append/submission boundaries and own pending queries. The approved saga
predecessor is now carried to the append comparison as described below. Unobserved ABA changes or coordinated rollback are not detected by a
snapshot equality check. Existing signer validation, write-ahead intent,
post-claim veto, accepted/unknown outcome persistence and no-rebroadcast rules
remain in force; no late lease check is added that discards a known external
outcome.

The existing coordinator proof adds 49 cases: ten independent state/policy
changes at each of three observed cuts, unchanged and reordered-field controls,
non-executing preconditions, delegated signer failures, revoked confirmation or
apply, a shared-record alias, post-sign hook/clock drift, snapshot failure,
invalid signer methods, captured-method/receiver controls, and two successful
signer-accessor side effects on reader-shared custody. Each new accessor case
requires one property read, prepared-state HOLD and zero delegated effects.
The dedicated workflow requires the new marker/count alongside the accepted
28-case admission proof, production build and broad proof compilation. The
Precision verifier additionally requires omitted pre-sign checking, omitted
pre-supervisor checking and an aliased baseline mutant to fail discriminating
assertions. Two separate restored-old-order controls must also fail the new
get_address and sign_transaction accessor assertions respectively.
This source/proof change performs no production signing or RPC.

## Approved predecessor at the write-ahead append

The guarded coordinator now passes a frozen three-field
`expected_execute_predecessor` derived from its detached prepared snapshot:
`saga_id`, `event_count`, and `last_event_id`. Missing or malformed head fields
HOLD before any signer delegation. This is trusted server composition, not a
new HTTP input or execution permission. The existing 49 prepared-state and
28 admission cases remain required.

The real saga supervisor captures a closed, descriptor-read copy of that
expectation before consulting its store. Absent control preserves legacy
callers; a present undefined/null, inherited control, accessor, extra/symbol
field, invalid identifier or out-of-range count is rejected. Its lease-acquired
recovery must match the approved head and select `execute_prepared_transaction`.
It does not initialize missing history when an expected predecessor was supplied.

Crucially, the broadcast-intent event uses the captured approved sequence and
previous-event ID, not a later recovered alias. The unchanged filesystem
`appendEvent` then compares these event fields with recovered current history
under its existing append lock. Drift before supervisor recovery is rejected
early; drift after that sample is rejected by the actual append comparison.
No execution adapter is called until that write-ahead append succeeds. A
caller-supplied expectation cannot disable any confirmation or lease check.
Explicit retry after definitive no-submission needs the new exact history head.

The existing saga proof adds 36 cases over real disposable filesystem stores.
It covers matched outcomes, omission compatibility, dry/confirmation boundaries,
retries, missing/stale/foreign/wrong-stage heads, closed input admission,
non-invoked accessors, private expectation capture and changes immediately before
intent construction or append entry. Those scheduled competing histories are
synthetic and use the acquired test lease; they are not hostile multi-process
or production-PostgreSQL evidence. Five coordinator cases check forwarding,
invalid-head no-signing and reconciliation truth after a supervisor refusal.
The original saga proof and both coordinator suites run in the existing
Node22/24/26 workflow. Host verification additionally rejects dropped forwarding
and removed event-head pinning variants.

This closes approved saga-predecessor propagation to the existing append CAS.
The generic saga append lease still uses its existing clock contract. For the
lease-bound payment-keyed path, the coordinator composition below additionally
places a trusted database-time dispatcher admission inside that same append lock
immediately before the write-ahead broadcast intent. No continuous lease,
cross-store atomicity, rollback detection, credential custody or exactly-once
production fulfillment is claimed. Refusal can acquire/release the local saga
lease, but appends no intent or outcome and calls no external adapter for that
refused attempt. A known external outcome remains preserved by the original
evidence/projection path; no late recheck is used to erase it. The dispatcher
preview remains non-executing.

## Canonical lease-session coordinator runner

`createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1(options)` composes the
existing canonical PostgreSQL lease session with this fixed coordinator. Its
`run_once(lease, requestFingerprint, input)` takes trusted server inputs, not an
HTTP request or a caller-selected action. The supplied fingerprint must match
both the dispatcher job and the detached custody request. The attempt selector
must match the captured lease; changing it while initial SQL is pending cannot
select another attempt. Neither the lease nor the transaction interface is
returned or forwarded to the signer. Pool construction and production admission
remain outside this factory. The existing standalone coordinator API is preserved.

For the lease-bound path, the canonical session performs its initial database
validation before entering the coordinator. Additional rechecks occur before
actual address lookup, before actual transaction signing, after signing/hooks
before supervisor entry, while the saga store holds the append lock immediately
before `broadcast_intent_committed`, and in the custodian's existing
post-claim admission slot. The locked callback rechecks prepared state after its
awaited database sample and before the intent write. A failed locked admission
writes no broadcast intent and reaches neither submission-guard claim nor
broadcaster. The prepared-state/confirmation/policy checks around signer access
still execute AFTER their awaited signer-side database checks. A failed lease
check does not falsely claim a refused signer method was called. The
already-captured original submission veto must pass first; the final lease sample
follows it, so the lease is sampled again after the durable write-ahead intent and
that awaited veto. Only literal true continues. Existing refusal/timeout
claim-retention semantics and the single custodian timeout remain controlling.

The canonical non-replayable session owns the whole coordinator invocation.
Its existing per-job admission excludes cooperating reclaims until completion.
When post-claim admission times out with SQL still pending, the connection,
transaction and advisory lock remain owned until the started query settles.
A late veto cannot start SQL after the session has closed. No new retry or
connection-lifetime mechanism is introduced, and the canonical store's ordinary
database-only retry path is unchanged.

The returned outer `status=completed` means that the session callback returned
and store completion was confirmed. It is NOT payment acceptance: inspect the
nested `result.value`, which may be a dry run, HOLD or coordinator outcome.
When commit/cleanup fails, the outer status requires reconciliation and retains
the coordinator's complete returned result. A known accepted/unknown outcome is
not replaced with no-submission, and the callback is never replayed automatically.
This retention is in-process; existing business journals remain the durable
recovery authority. No dispatcher result publication or restart deduplication is
invented by this wrapper.

Thirty-two composed cases run the real coordinator, custodian, lease session and
PostgreSQL adapter over an injected SQL transport, disposable fixture storage
and the existing public synthetic signing key. These cover all six lease cuts,
including expiry at the locked write-ahead intent boundary, prepared-state drift
during that locked database wait, identity mismatches, failures, original veto
ordering, commit/cleanup ambiguity and three natural five-second timeout
schedules. The coordinator's synthetic saga implementation mirrors the locked
callback but remains a test stand-in. The separate accepted 36-case
real-filesystem predecessor proof remains, and five additional real-filesystem
cases prove the async admission runs while the append lock is held and refusal
or failure writes no intent. The preserved 49/28/five-case suites and lower
42/32/15-case proofs remain.

**Still not cross-store atomic execution:** the locked sample closes the specific
time-of-check/time-of-write gap between the pre-supervisor dispatcher sample and
the durable `broadcast_intent_committed` append. It does not make PostgreSQL
and filesystem mutation one transaction, certify continuous lease validity,
prevent the dispatcher lease from expiring after the intent write, establish
unobserved ABA/rollback resistance, or prove end-to-end production fulfillment.
The existing post-claim database sample still fences the later broadcaster call;
if authority is lost after the intent write, the durable saga remains in the
existing reconciliation path rather than being silently rebroadcast. The runner
is not mounted in a worker/HTTP runtime, does not consume a preview as execution
authority, and does not bypass confirmations or activation gates. No production
pool, signer or broadcaster is constructed; no service, schema, package, wallet,
inventory, Work Credit, validator or funds action is performed by publishing the
source. Runtime mounting and production dependency construction remain separate
review gates.

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

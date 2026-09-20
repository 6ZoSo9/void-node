# Buy VOID payment-keyed dispatcher lease session v1

This source-only internal composition binds the accepted non-replayable
PostgreSQL runner to dispatcher lease validation. It has no public route,
production connection factory, signer, broadcaster, or activation switch.

## Entry and exact lease identity

`createBuyVoidPaymentKeyedDispatcherLeaseSessionV1(options).run_once(lease,
requestFingerprint, action)` uses the fixed canonical non-replayable runner,
not a caller-selected store. Its options are the existing trusted pool and
bounded SQL lock/statement timeout configuration. Retry options remain rejected.

Before acquiring a connection, capture the exact six-field lease as immutable
plain data. Require canonical lowercase IDs, the marker, positive bigint
generation/expiry, a 128-bit token and the bounded worker identity. Ordinary
accessors and extra/symbol fields are rejected. This is trusted internal server
composition, not a decoder for hostile Proxy graphs or external JSON. The
request fingerprint must come from the existing durable-custody composition;
this module does not independently read or authenticate that custody record.

Inside the real canonical per-job advisory lock and SERIALIZABLE transaction,
read the exact job before sampling database time. Require the unpublished job,
request fingerprint, generation, token, worker and exact expiry to match. The
clock must be positive and the lease expiry strictly later. A delayed row read
must not reuse a timestamp captured before the delay. Entry refusal invokes no
action. The accepted job version is retained for subsequent rechecks.

## Owned rechecks

The frozen session exposes only its attempt ID and `revalidate_lease()`; it does
not expose the lease token, pool, client, or transaction methods. A recheck
repeats the row/identity/time checks inside the same admitted transaction and
also rejects changed job version or a regressing database clock. A failed check
latches the session closed to further SQL rechecks even if data is restored.
Overlapping rechecks fail closed without creating a second queued query.

Before the action's return or exception reaches the canonical adapter, revoke
new rechecks and await the already-started one. Neither COMMIT nor ROLLBACK,
advisory unlock, timeout restoration, nor client release can proceed while that
lease read remains pending. A read that finishes after revocation returns false
and cannot start its next SQL statement. An escaped old session remains inert
and cannot query or poison a new invocation.

There is deliberately no race against an outer timer that claims a still-running
query has ended. Driver/pool acquisition and query settlement remain trusted;
a never-settling driver operation can keep this invocation pending. Existing
SQL timeouts are not advertised as client cancellation or universal liveness.
The wrapper owns only its own rechecks, not arbitrary detached work started by
the action. The eventual fixed action must await all its own effect operations.

## Returned outcome and limits

`completed` means the action returned, all lease checks performed by this
session passed, and the canonical store completed. It is not the action's
business success and it is not proof that the lease remained valid for its
entire duration. A caller must not cache an earlier true for a later effect.

`held` means no action was entered. `reconciliation_required` means an action
was entered and then failed, a recheck failed, or store completion is uncertain.
Even a body that ignores a failed recheck cannot produce a completed envelope.
The wrapper cannot undo or prevent effects that such an incorrectly written
body already performed; final effect placement remains a separate integration.

A returned action value, including undefined/null/false/zero, is preserved before
store completion. It survives commit and cleanup faults. It is an internal
reference, not a deep-frozen or sanitized public receipt: do not serialize it
blindly. Metadata claiming the session does not expose a token/transaction does
not classify arbitrary data returned by the caller's action. Unknown action
exceptions are replaced by a fixed sentinel before reaching driver SQL-state
handling; exception content is not inspected or returned.

At-most-once remains scoped to one invocation. Explicit new invocations may run
again. No durable cross-call/process deduplication, external-effect/database
atomicity, lease renewal, dispatcher publication, saga validation, source
finality or cryptographic custody is added. Initial lease admission and recheck
samples are not a substitute for the fixed signing/write-ahead-intent/submission
checks required by the complete dispatcher execution adapter. The accepted
#1574 context remains non-executing; #1577's admission hook and #1579's runner
remain distinct accepted prerequisites.

## Verification

The committed proof executes the actual canonical PostgreSQL adapter and
non-replayable runner over a deterministic injected SQL transport. Its 42 cases
cover accepted/rejected lease identities, expiry during the row read, version
and clock drift, failure latching, escaped sessions, overlapping rechecks,
pending job/clock reads through normal and exceptional action termination,
commit/cleanup faults, exact generic values, input capture, opaque failures,
and the explicit cross-invocation non-guarantee. No PostgreSQL server or real
signer/provider is used. An absolute proof deadline prevents silent early exit.

The focused Node 22/24/26 workflow requires typecheck/build, the 42-case marker,
the accepted 32-case non-replayable proof, both original store/dispatcher proofs,
focused TypeScript compilation and diff hygiene. Local harness results must be
labeled separately when their underlying adapter is substituted; only actual
hosted/host execution qualifies the complete repository composition.

Source publication or acceptance grants no production database, service,
credential, wallet, signing/broadcast, inventory, WC/validator, gas-policy,
transaction, deployment, scheduler or funds authority.

## Real component composition with post-claim admission

`scripts/prove_buy_void_payment_keyed_lease_admission_composition_v1.ts` composes
this session and the canonical non-replayable/store implementation with the
actual custodian broadcaster's captured post-claim admission hook. The proof
uses the existing request/unsigned-transaction builders and a fixed public
synthetic wallet for input validation. Source-finality observations, SQL
transport, submission-guard persistence and provider responses are fixtures;
there is no production credential, database server or network broadcast.

The 15 named cases cover valid exact-byte handoff, initial lease refusal,
post-claim expiry/generation/clock drift, claim refusal, delayed admission,
accepted outcomes across three COMMIT faults and cleanup failure, and four
natural five-second timeout schedules (pending row or clock read, followed by
late success or rejection). At the actual admission timeout, the business result
is HOLD but the outer session must remain pending, with its lock/transaction
owned and no COMMIT, ROLLBACK, unlock, timeout reset or client release. Only
settlement of the outstanding query permits cleanup. A revoked row read cannot
start its next clock query, and late admission cannot resume broadcasting. A
later explicit invocation still encounters the fixture's retained guard claim.

These assertions cover the interaction between the existing components rather
than substituting a fake admission timeout or a fake session. They do not add
production wiring or prove a durable submission guard, server cancellation,
continuous lease validity, source finality, saga/custody reconstruction or
signing/write-ahead-intent effect fences. Synthetic accepted results are not
payment receipts. The test deliberately distinguishes store orchestration
completion from the contained business decision.

The existing Node 22/24/26 workflow requires the new GREEN and `cases=15`
markers plus strict proof compilation while retaining all prior checks. Both
trigger lists include the new proof and the Buy VOID economic source family
because transitive request validation is part of this composition. The suite
has a failing 60-second deadline; its four real waits add about 20 seconds to
each focused job. A silently exiting or wedged promise is not a proof pass.

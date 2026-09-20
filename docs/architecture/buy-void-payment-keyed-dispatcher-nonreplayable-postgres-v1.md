# Buy VOID dispatcher non-replayable PostgreSQL execution v1

Status: source-only internal execution prerequisite; no runtime route or live
connection factory. This does not complete leased signing or broadcast admission.

## Why the database retry contract is not an external-effect contract

The canonical PostgreSQL dispatcher adapter correctly retries database-only
callbacks on serialization failure (`40001`) and deadlock (`40P01`). A failed
COMMIT can therefore cause the callback to run again. Repeating a callback that
already signed, wrote a filesystem journal, or submitted a transaction would be
unsafe unless that callback independently prevented every repeated effect.

The new factory composes the existing canonical adapter with exactly
`max_attempts: 1`. It accepts only a trusted injected pool and the existing lock
and statement timeouts. It does not accept retry counts, retry hooks, another
store implementation, or operation-policy overrides. The original dispatcher
adapter, its default retries, SQL, schema and existing callers are unchanged.

The runner has a distinct `run_once` interface rather than pretending to be the
retrying dispatcher store. It keeps the canonical session advisory lock before
SERIALIZABLE BEGIN, the transaction interface, cleanup, timeout restoration and
client release. A second callback entry is independently blocked in-process.

## Outcome contract

The runner reports its own orchestration outcome, not business success:

- `completed`: the action returned and the canonical store returned successfully.
  The action's own returned decision can still be a HOLD or rejection; the
  consumer must validate it. Store completion is not a fulfillment receipt.
- `held`: invalid input or a store failure before the action began. No action was
  invoked. No automatic retry is authorized, even in this case.
- `reconciliation_required`: an action began but store completion was not
  confirmed, or callback reentry was blocked. An SQL rollback does not prove
  external effects were rolled back. A callback that throws is conservatively
  ambiguous even when it did not return a value.

A callback's successfully returned value is retained before COMMIT and remains
available after COMMIT, rollback, advisory-unlock, timeout-reset or client-release
failure. A `{ value }` box distinguishes a returned `undefined` from no completed
return. The wrapper does not copy exception messages, SQL details or exception
objects into its result.

The value is an internal reference, not a sanitized public record, immutable
snapshot, signature, or durable receipt. The frozen envelope and return box do
not freeze caller-owned nested data. A future public dispatcher must validate
and sanitize the specific business result; it must never serialize this generic
internal value blindly.

## Exact limits

At-most-once invocation applies to one call to `run_once`, not to multiple calls,
processes, hosts, or restarts. Two explicit calls can invoke the action twice.
Durable saga recovery and the existing payment-keyed submission guard remain
mandatory for cross-invocation and crash recovery. This adapter neither stores
nor reconstructs durable execution outcomes.

The callback may have effects; this primitive itself does not construct a signer,
read credentials, build a broadcaster, call a production provider, or grant any
such authority. The caller must be reviewed server-owned composition, not a
participant-supplied callback.

There is no lease, saga-head, policy, confirmation, write-ahead-intent or
submission-guard validation in this primitive. The next composition must enforce
those existing gates at the real signing/intent/submission cuts, while retaining
admission and exact operation identity. A successful #1574 preview is not an
execution capability and cannot substitute for those checks.

SQL lock and statement timeouts are inherited. This wrapper adds no wall-clock
bound to pool acquisition or the action and does not cancel detached work. It
must not race a pending action against a timeout and then pretend its effects or
session lifetime have ended. Pool/client/driver behavior remains trusted.

## Verification

The focused proof runs the actual canonical adapter with a deterministic injected
SQL transport. It does not use a PostgreSQL server. Its 32 cases include both
unchanged default retry controls, exact normal SQL ordering, COMMIT failures for
all three modeled SQL states, lost reply after a simulated committed transaction,
callback exceptions after a simulated effect, rollback and cleanup failures,
pre-action failures, exact false/null/undefined returns, rejected retry options,
configuration capture, and the explicit cross-invocation non-guarantee.

The Node 22/24/26 workflow runs repository typecheck/build, the new proof, both
existing dispatcher/store proofs and focused proof TypeScript compilation. A
bounded proof deadline prevents silent early success on a pending promise.

No synthetic effect counter is a real signature, broadcast, payment or external
acceptance. No merge, deployment, service action, live database qualification,
production execution or funds authority follows from this source proof.

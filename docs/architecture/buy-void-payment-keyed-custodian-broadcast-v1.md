# Buy VOID payment-keyed custodian broadcast v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1`

Confirmation: `buyVoidBroadcastPaymentKeyedCustodianTransactionV1`

## Purpose

This is the reviewed handoff between the payment-keyed custodian signer and the
payment-keyed Chain-2050 broadcaster. It does not mount or activate a runtime
route.

The module accepts the original custodian request plus the signed result from
the signer. Before a broadcaster or durable submission guard is touched, it
independently revalidates the request, canonical payment key, exact fulfillment
calldata, call fingerprint, transaction-plan fingerprint, #1525 canonical
unsigned-transaction fingerprint, request fingerprint, request idempotency key,
raw signed transaction, signer address, transaction hash, fees, target, value,
calldata, and empty access list.

It also passes the raw signed transaction through the merged #1523 local
payment-keyed transaction inspection wall and requires the decoded payment ID,
recipient, amount, target, calldata, and transaction hash to match the request.

## Durable submission binding

Apply mode derives a deterministic submission idempotency key from:

- the custodian request idempotency key;
- the exact signed transaction hash; and
- the canonical unsigned-transaction fingerprint.

The durable submission guard claim binds that key to the execution attempt,
signed transaction hash, and transaction-plan fingerprint under the marker
`VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1`.

The broadcaster is never called unless that claim succeeds.

A definitive no-submission result releases the claim with the existing
retry-safe `broadcast_definitively_not_submitted` reason. An exception,
ambiguous provider result, or accepted hash mismatch leaves the claim in place,
requires reconciliation, and forbids automatic retry.

## Explicit apply gate

Broadcast requires all of:

- a fully validated signed result;
- `apply=true`;
- exact confirmation `buyVoidBroadcastPaymentKeyedCustodianTransactionV1`;
- an injected durable submission guard; and
- an injected broadcaster.

Dry run performs no guard claim and no broadcast call.

## Optional post-claim submission admission

Trusted server composition may supply `dependencies.before_external_submission`.
This is an optional veto seam for the forthcoming dispatcher execution fence,
not an HTTP request field or a new grant of execution authority. Existing callers
without the hook retain their prior behavior; this change alone does not make
those callers dispatcher-lease-bound.

The selected function is captured once before awaiting the durable guard claim.
It is invoked exactly once only after a successful claim and before the external
broadcaster. Deleting or replacing the dependency while the claim is pending
cannot remove that selected check. A present non-function fails before claiming.
Dry runs, invalid signed bindings, wrong confirmations and failed/refused claims
do not invoke the check.

The hook receives a frozen six-field identity: attempt ID, expected transaction
hash, submission idempotency key, request fingerprint, unsigned-transaction
fingerprint and transaction-plan fingerprint. It receives no raw signed bytes,
request object, credential, lease token, provider ID or broadcaster object.
Only literal `true` admits the handoff. False, malformed return values, exceptions
and promise rejection fail closed. Thrown values are neither inspected nor
included in the result.

Asynchronous admission waiting has a fixed 5,000 ms timeout, checked against a
monotonic deadline as well as a timer. The timer is cleared on every terminal
path. Late fulfillment or rejection cannot resume broadcasting. This is not
preemption of synchronous code or cancellation of the checker's underlying work;
trusted checkers must own their own bounded, read-only database operations.

On rejection or timeout the result states `status=held`,
`submission_guard_claimed=true`, `submission_guard_released=false`,
`broadcast_call_performed=false`, `reconciliation_required=true` and
`retry_allowed=false`. This is not a provider-certified no-submission result and
does not enter the existing guard-release path. A later explicit invocation
still encounters the retained claim. When called from the write-ahead saga, the
existing intent remains available for reconciliation rather than rebroadcast.

The existing Node 22/24/26 proof adds 28 post-claim controls, retaining all prior
signature, request-binding, provider-outcome and exact-byte handoff tests. The
claim and admission conditions are synthetic; these controls do not prove a
real PostgreSQL lease, transaction retry behavior, live submission or designated
host execution. The dispatcher must still supply its fixed current-lease and
saga-identity check, maintain admission through effects, and preserve outcomes
across database retries. No dispatcher apply route is mounted by this change.

## Raw transaction handling

The raw signed transaction is accepted only as part of the already validated
signer result. It is revalidated before use, passed directly to the injected
broadcaster, then not persisted or returned by this module.

## Authority boundary

The module itself performs no RPC, credential access, wallet access, signing,
filesystem access, deployment, or runtime route mount. Its injected broadcaster
may submit the transaction only in explicitly confirmed apply mode, and its
injected durable guard may write its journal.

The proof uses a fixed ephemeral test wallet plus synthetic guard/broadcaster
dependencies. It performs no live RPC, transaction broadcast, deployment, or
funds movement.

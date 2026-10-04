# Buy VOID verified-payment capacity admission v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1_GREEN`

## Purpose

Serialize the finite-presale inventory decision at the exact transition where a
verified USDC payment would become a `payment_verified` operator event.

Unpaid requests remain quotes and reserve no VOID. Therefore a request-time
remaining-inventory check is not sufficient near sellout: multiple unpaid
requests can coexist and later attempt to become verified obligations.

## Admission boundary

`writeBuyVoidOperatorEventWithCapacityAdmissionV1(...)` uses one filesystem
bakery lock rooted inside the Buy VOID request directory.

For `payment_verified` only, while holding that lock it:

1. pins the request directory with `O_DIRECTORY|O_NOFOLLOW`, opens the
   authoritative `requests.jsonl` and `operator-events.jsonl` through that
   retained directory descriptor, and strictly parses bounded descriptor reads;
   malformed rows, missing verified requests, changed quote amounts, inode/path
   replacement, size growth, or read-time identity drift fail closed;
2. requires the candidate request id to exist in the durable request ledger
   with exactly the same quoted VOID amount supplied to admission, reconstructs
   that request's durable source-chain and payment-transaction binding from the
   append-only request history, rejects chain/tx regression or substitution,
   and requires the candidate event plus caller request object to match that
   durable payment binding before deriving the unique verified-request
   reservation total and checking whether this request is already verified;
3. re-reads the legacy sale-state projection only as a cross-check and requires
   it to match the strict ledger recount exactly;
4. validates exact six-decimal pool/reserved/verified/remaining conservation;
5. rejects if the new quoted VOID exceeds current remaining inventory;
6. keeps both admitted `requests.jsonl` and `operator-events.jsonl`
   descriptors open while the capacity lock crosses the existing
   launch-generation authority mutation and per-request closeout lock;
7. immediately before append, requires both retained ledgers to match their
   exact post-census size/mtime/ctime/inode/custody snapshots, then rebinds the
   visible operator-ledger path to that exact opened inode, writes with
   `O_APPEND` through the retained descriptor, fsyncs that inode, and
   rebinds the visible path again before accepting post-state;
8. strictly re-reads the same operator-ledger inode plus a descriptor-bound
   request ledger and requires verified/reserved inventory to increase by
   exactly the quote and remaining inventory to decrease by exactly the quote;
9. only after that authoritative postcheck succeeds, publishes the per-event
   sidecar used by bounded orchestration. The `payment_verified` JSONL event
   is fsynced before the postcheck, but a failed postcheck exposes no sidecar.
   If a crash or failed postcheck leaves the durable JSONL event without that
   sidecar, exact re-verification reconstructs the original timestamped sidecar
   from the authoritative event under the request lock without appending
   another reservation.

The lock order is:

`verified-payment capacity -> launch-generation authority -> request closeout`.

No reviewed path acquires the capacity lock in reverse order.

### Duplicate-payment identity integration

On the stacked runtime-integration lane, the canonical
`VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1` classifier runs inside
this same capacity lock after the descriptor-bound ledger census and before
idempotent/capacity admission.

The candidate must be an identity-complete
`void_buy_void_verified_payment_event_v2` event. Existing
`payment_verified` history is validated through the same parent guard. The
guard rejects one canonical
`source_chain:transaction_hash:log_index` identity being owned by multiple
requests and rejects one request changing payment identity. Only exact request
plus exact payment identity replay is idempotent.

After the durable JSONL append, the same candidate is reclassified against the
same retained operator-ledger inode and must be idempotent before the capacity
transition can succeed.

No second duplicate-guard lock is introduced.

## What this closes

The focused proof races two 6 VOID payments against a 10 VOID pool. Exactly one
may append `payment_verified`; the other receives
`buy_void_verified_payment_capacity_exceeded`. It then admits an exact 4 VOID
boundary payment, rejects any further reservation, and proves duplicate
verification of the already-reserved request is idempotent.

The same proof deletes the exact 4 VOID event sidecar after its durable JSONL
append to model the crash window. Re-verification restores the historical
sidecar from the JSONL record, creates no sidecar for the retry timestamp, and
does not invoke launch-authority mutation or change the reserved total.

A separate adversary deliberately returns a stale sale-state projection after
the durable event append. The authoritative postcheck rejects that invocation
with the JSONL event still recoverable but no orchestration sidecar published;
an exact retry against a corrected projection is idempotent and recovers that
single historical sidecar without appending a second event.

Filesystem adversaries additionally replace or grow the authoritative request
ledger after its admitted `fstat`, mutate either retained ledger on the same
inode after the pre-census snapshot, and replace or grow the operator ledger
after the capacity census but before launch/request mutation. Those cases must
HOLD before any `payment_verified` bytes or sidecar are written to a
replacement target.

The proof also supplies a candidate absent from `requests.jsonl`, a candidate
whose caller quote disagrees with the durable request quote, and candidates whose
caller/event payment tx hash or source chain disagree with the durable latest
request binding. All must HOLD before the launch-authority mutation callback is
entered.

All arithmetic is exact micro-VOID integer arithmetic derived from canonical
decimal text with at most six decimals. The legacy runtime readers may remain
lenient for operator display, but they are not capacity authority: the admission
module independently parses every authoritative ledger row and HOLDs on
corruption or a projection mismatch.

## Remaining HOLD

The stacked runtime-integration lane closes canonical duplicate-payment
identity admission in source, but does not itself prove that a deployed public
runtime is serving those reviewed bytes.

The dedicated append-only allocation-reservation record remains a separate
launch gate. The parent coupled-launch source gate therefore remains hard-HOLD
with
`VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1=false`.

That constant must not be promoted by this lane.

## Authority

The module may serialize and write the existing local operator-event record when
called by the runtime. It does not verify a blockchain receipt itself and grants
no wallet/signer/private-key, transaction, Chain-2050, inventory-funding,
token-transfer, market/presale-activation, or funds authority.

The repository proof uses only temporary local files and synthetic request/event
objects.

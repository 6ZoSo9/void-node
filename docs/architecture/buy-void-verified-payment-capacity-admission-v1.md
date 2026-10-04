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

1. strictly parses the raw `requests.jsonl` and `operator-events.jsonl`
   authority files; malformed rows, missing verified requests, or changed quote
   amounts fail closed;
2. validates the candidate's canonical
   `source_chain:transaction_hash:log_index` identity against every historical
   V2 `payment_verified` event while the same capacity lock is held;
3. rejects cross-request payment-identity reuse and same-request identity
   changes; only an exact same-request + same-identity replay is idempotent;
4. derives the unique verified-request reservation total directly from those
   raw ledgers and checks whether this request is already verified;
5. re-reads the legacy sale-state projection only as a cross-check and requires
   it to match the strict ledger recount exactly;
6. validates exact six-decimal pool/reserved/verified/remaining conservation;
7. rejects if the new quoted VOID exceeds current remaining inventory;
8. keeps the capacity lock held while the existing launch-generation authority
   mutation and per-request closeout lock append the event;
9. strictly re-reads identity, raw-ledger, and sale-state projections after the
   append and requires both the same canonical payment identity and the expected
   verified/reserved inventory delta;
10. durably fsyncs the `payment_verified` JSONL append before publishing the
   per-event sidecar used by bounded orchestration. If a crash leaves the
   durable JSONL event without that sidecar, exact re-verification reconstructs
   the original timestamped sidecar from the authoritative event under the
   request lock without appending another reservation.

The lock order is:

`verified-payment capacity -> launch-generation authority -> request closeout`.

No reviewed path acquires the capacity lock in reverse order.

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

All arithmetic is exact micro-VOID integer arithmetic derived from canonical
decimal text with at most six decimals. The legacy runtime readers may remain
lenient for operator display, but they are not capacity authority: the admission
module independently parses every authoritative ledger row and HOLDs on
corruption or a projection mismatch.

## Remaining HOLD

The stacked verified-payment identity admission lane now proves canonical
`source_chain:transaction_hash:log_index` uniqueness inside this same
serialization boundary. That source advance does not itself activate the public
verifier.

The final append-only allocation-reservation record remains a separate required
gate. The parent coupled-launch source gate therefore remains hard-HOLD with
`VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1=false`.

That constant must not be promoted by this lane.

## Authority

The module may serialize and write the existing local operator-event record when
called by the runtime. It does not verify a blockchain receipt itself and grants
no wallet/signer/private-key, transaction, Chain-2050, inventory-funding,
token-transfer, market/presale-activation, or funds authority.

The repository proof uses only temporary local files and synthetic request/event
objects.

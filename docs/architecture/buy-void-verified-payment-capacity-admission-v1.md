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

1. checks whether the request is already verified and makes exact retries
   idempotent;
2. re-reads the current sale state;
3. validates exact six-decimal pool/reserved/verified/remaining conservation;
4. rejects if the new quoted VOID exceeds current remaining inventory;
5. keeps the capacity lock held while the existing launch-generation authority
   mutation and per-request closeout lock append the event;
6. re-reads sale state and requires verified/reserved inventory to increase by
   exactly the quote and remaining inventory to decrease by exactly the quote.

The lock order is:

`verified-payment capacity -> launch-generation authority -> request closeout`.

No reviewed path acquires the capacity lock in reverse order.

## What this closes

The focused proof races two 6 VOID payments against a 10 VOID pool. Exactly one
may append `payment_verified`; the other receives
`buy_void_verified_payment_capacity_exceeded`. It then admits an exact 4 VOID
boundary payment, rejects any further reservation, and proves duplicate
verification of the already-reserved request is idempotent.

All arithmetic is exact micro-VOID integer arithmetic derived from canonical
decimal text with at most six decimals.

## Canonical payment identity extension

The stacked payment-identity lane now preserves the matched transfer log index
and derives the existing canonical identity
`voidpay1:<source_chain>:<transaction_hash>:<log_index>` inside this same
serialized admission boundary. Cross-request reuse is rejected, a verified
request cannot switch to a different payment identity, and exact re-verification
remains idempotent.

See
`docs/architecture/buy-void-verified-payment-identity-admission-v1.md`.

## Remaining HOLD

The final append-only allocation reservation record is still a separate required
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

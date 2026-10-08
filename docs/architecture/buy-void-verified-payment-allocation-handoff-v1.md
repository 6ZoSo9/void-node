# Buy VOID verified-payment allocation handoff v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1`

Status: **source-only durable accounting bridge; unmounted; production HOLD**.

## Purpose

Close the source-level crash gap between the existing durable
`payment_verified` append and the separately reviewed canonical
`allocation_reserved` publication contract.

This bridge deliberately reuses:

- the existing global verified-payment capacity bakery lock;
- the exact durable `payment_verified` JSONL append + fsync;
- the canonical duplicate-payment guard;
- the canonical allocation reservation planner;
- the descriptor-bound dual-root allocation publication writer;
- the canonical allocation high-water contract; and
- the existing verified-payment/allocation replay classifier.

It does not introduce another payment identity, allocation record type,
capacity counter, or storage format.

## Source API

`writeBuyVoidVerifiedPaymentAllocationHandoffV1(...)` is a new source API.
The existing mounted router is **not** changed by this PR.

Inputs include the already-reviewed request/event, request-history root,
allocation ledger root, allocation high-water root, launch-authority mutation
callback, and sale-state reader. The allocation roots are explicit caller
inputs because runtime/deployment binding remains a later authority gate.

## Serialized order

For a first accepted payment, one invocation holds the existing
`.verified-payment-capacity-admission-v1` lock across the complete accounting
handoff:

```text
capacity lock
  -> descriptor-bound request/operator census
  -> reject any older verified payment lacking allocation
  -> duplicate/capacity admission
  -> current launch-generation assertion
  -> request lock
  -> durable payment_verified append + fd fsync + directory fsync
  -> allocation snapshot/recovery
  -> canonical allocation plan
  -> dual-root allocation publication + fsync/recovery protocol
  -> exact replay-binding postcheck
  -> payment sidecar publication
  -> request/operator capacity postcheck
```

No allocation publication is attempted before the payment row is durably
fsynced.

## Exact event identity

The allocation record's `payment_verified_event_sha256` is SHA-256 of the
exact canonical durable operator-event line bytes:

```text
JSON.stringify(payment_verified_event) + "\n"
```

This is the same event-line digest consumed by
`classifyBuyVoidVerifiedAllocationReplayBindingV1(...)`.

The allocation planner continues to derive the single canonical payment
identity:

```text
voidpay1:<base|ethereum>:<transaction hash>:<log index>
```

The deterministic `voidalloc1_...` record identity remains derived from
request/payment/event/launch lineage and does not depend on the allocation
timestamp.

## Cross-request gap rule

Before appending a **new** payment, the handoff snapshots the descriptor-bound
allocation ledger and requires every already-durable verified payment in the
capacity census to classify as `allocation_present`.

Any older `verified_allocation_missing` result HOLDs **before** the new
payment row is appended.

This prevents a crash gap on request A from being silently carried forward
while request B creates another obligation.

## Crash replay

If a crash occurs after payment fsync but before allocation publication,
an exact replay of the same canonical event:

- recognizes the already-durable event;
- requires the replay event to equal the exact historical canonical JSON row;
- does **not** append another payment;
- does **not** add another capacity obligation;
- permits the current request to be the sole missing-allocation exception;
- reuses the original request's accepted launch lineage rather than requiring a
  fresh unexpired sale lease;
- plans/publishes the same deterministic allocation once; and
- publishes/repairs the payment sidecar only after allocation durability.

If the crash occurs after allocation publication but before sidecar/public
response, replay is idempotent for both payment and allocation and repairs only
the missing sidecar/result surface.

## Allocation publication custody

The underlying allocation writer still enforces:

- separate ledger/high-water roots;
- same-UID private directories/files;
- ancestor walking through retained `O_DIRECTORY|O_NOFOLLOW` descriptors;
- descriptor-bound bounded reads;
- redundant publication intents;
- exact one-record append admission;
- atomic ledger and high-water replacement;
- mid-publication recovery; and
- post-publication visible-root revalidation.

The new snapshot API may complete an already-started writer publication before
returning current ledger bytes. It never plans or appends a fresh allocation by
itself. A subsequent candidate must still pass the existing persist writer's
fresh lock/revalidation.

## Stable internal evidence refs

The canonical allocation record requires several SHA-256 content references.
The handoff derives them internally from reviewed state rather than accepting
caller-selected strings:

- payment receipt ref: exact canonical `payment_verifier` object bytes;
- payment event ref: exact durable event JSONL line;
- duplicate-guard ref: domain-separated request/payment/event lineage;
- capacity-guard ref: domain-separated pool/quote/event lineage; and
- activation ref: the request's canonical launch activation receipt SHA.

These refs are deterministic across exact replay. The allocation
`created_at_ms` may advance to preserve ledger chronology, but it is not part
of the deterministic record ID and is ignored by the planner's exact
idempotent lineage comparison.

## Proof

`prove_buy_void_verified_payment_allocation_handoff_v1.ts` uses real
temporary filesystem roots and exercises the actual writer/fsync path.

It proves:

- first payment produces one durable payment and one allocation;
- exact replay produces neither duplicate;
- crash immediately after payment fsync leaves one payment / zero allocation,
  and exact replay creates exactly one allocation without a fresh launch lease;
- crash after allocation publication but before sidecar leaves one payment /
  one allocation, and replay repairs without duplication;
- an older verified payment with missing allocation blocks a different new
  payment before that second payment can append; and
- allocation high-water remains exactly bound after each successful handoff.

The focused Node 22/24/26 workflow also reruns the existing payment-capacity
admission, allocation writer, verified-allocation replay, and hypothetical
crash-matrix proofs so their path-swap/growth, uniqueness, finite-capacity, and
history adversaries remain inherited.

## Authority boundary

This PR intentionally keeps:

```text
runtime_integration=false
protected_high_water_custody_proven=false
deployed_runtime_verified=false
public_presale_activation=false
production_gate_ready=false
wallet_or_signer_access=false
transaction_broadcast=false
chain2050_write=false
funds_movement=false
```

A later runtime composition must bind reviewed deployment identity and the
qualified allocation custody roots before this API can replace the current
mounted payment-event writer.

**PROTECT THE CORE.**

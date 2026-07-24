# Paid DataNet Fulfillment Receipt V1

Marker: `VOID_PAID_DATANET_FULFILLMENT_RECEIPT_V1`

## Purpose

This module completes the bounded manual Paid DataNet commercial chain:

1. generate a deterministic quote;
2. accept the quote and bind verified payment evidence;
3. record an explicit operator admission decision;
4. perform the work through a separate execution process;
5. record a deterministic fulfillment receipt tied to the admitted request.

The module records completion claims and evidence bindings only. It does not perform work or verify the underlying evidence contents by itself.

## Admission requirement

A fulfillment receipt may be appended only for an admission receipt that:

- belongs to a valid append-only admission receipt chain;
- has decision `APPROVE`;
- uses reason code `PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE`;
- has status `ADMITTED_AWAITING_SEPARATE_EXECUTION`;
- preserves the disabled payment, execution, Work Credit, and treasury controls.

Rejected requests cannot receive fulfillment receipts.

## Receipt bindings

Every fulfillment receipt binds:

- the exact admission receipt SHA-256;
- admission request ID;
- quote ID;
- service code;
- requester ID;
- admission operator ID;
- fulfillment operator ID;
- execution start and completion timestamps;
- completion or failure outcome;
- bounded outcome code;
- result-summary SHA-256;
- external operator-attestation SHA-256;
- zero to 256 evidence artifacts;
- evidence identifiers, hashes, media types, and byte lengths;
- aggregate evidence count and byte length;
- the previous fulfillment receipt hash.

Evidence artifacts are sorted by `evidence_ref` before hashing. Duplicate evidence references are rejected. This makes the receipt deterministic regardless of the caller’s input order.

## Completion semantics

`COMPLETED` requires:

- outcome code `DELIVERED_AS_QUOTED`;
- at least one evidence artifact;
- status `FULFILLED_DELIVERED`.

`FAILED` requires one of:

- `SOURCE_UNAVAILABLE`;
- `INTEGRITY_MISMATCH`;
- `EXECUTION_ERROR`;
- `EVIDENCE_INCOMPLETE`;
- `CUSTOMER_CANCELLED_AFTER_ADMISSION`.

A failed receipt may contain zero or more evidence artifacts and has status `FULFILLMENT_FAILED`.

## Operator attestation

`operator_attestation_sha256` is an opaque binding to an external operator attestation or signature artifact.

This module does not create signatures, access private keys, or claim that a plain receipt hash is a cryptographic operator signature.

## Append-only guarantees

The fulfillment chain requires:

- sequence numbers beginning at one;
- exact previous-receipt hash linkage;
- one fulfillment receipt per admission request;
- deterministic receipt SHA-256 verification;
- exact admission-field consistency when verified against the admission chain.

The module exposes both internal chain verification and admission-bound verification.

## Hard boundary

This module does not:

- collect or refund payment;
- execute DataNet work;
- contact a network;
- authorize automatic execution;
- issue, debit, or settle Work Credits;
- access wallets, signing keys, or treasury funds;
- add HTTP routes or public UI;
- deploy or restart services.

## Proof

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_fulfillment_receipt_v1.ts
```

The focused proof covers approved and rejected admissions, deterministic completed and failed receipts, evidence sorting, append-only chaining, admission binding, duplicate prevention, timestamp and identifier boundaries, bounded outcome semantics, tamper rejection, disabled controls, and invalid-chain rejection.

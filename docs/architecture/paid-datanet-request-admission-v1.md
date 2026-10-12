# Paid DataNet Request Admission V1

Marker: `VOID_PAID_DATANET_REQUEST_ADMISSION_V1`

## Purpose

This layer converts an accepted Paid DataNet quote plus externally verified payment evidence into an operator-reviewable admission request. It then produces deterministic, hash-chained admission decision receipts.

It does not collect money and it does not execute customer work.

## Input boundary

An admission request binds all of the following:

- the deterministic V1 quote identifier;
- the quoted service code;
- the requester identifier;
- the exact quoted total in integer USD cents;
- the quote expiration time;
- the requester's explicit acceptance of that quote;
- an opaque payment-evidence reference;
- the SHA-256 digest of the external payment evidence;
- the identifier of the external payment verifier;
- the verified amount, currency, and observation time;
- the admission submission time.

The payment reference is deliberately opaque. Raw payment credentials, card data, private keys, wallet secrets, provider access tokens, and complete payment payloads do not belong in this structure.

## Timing rules

The following ordering is required:

```text
quote requested
  <= customer accepted
  <= payment observed
  <= admission submitted
  <= quote expires
```

Expired quotes cannot be admitted. A new quote must be created instead.

## Amount and identity bindings

The request is rejected unless:

- the accepting requester matches the quote requester;
- the accepted quote ID exactly matches the supplied quote;
- the accepted total exactly matches the quoted total;
- the verified payment amount exactly matches the quoted total;
- the acceptance and payment currencies are `USD_CENTS`;
- the payment evidence status is exactly `VERIFIED`.

All money values are safe integers. Floating-point money is forbidden.

## Operator decision boundary

Admission remains manual in V1.

An operator may issue one of two decisions:

- `APPROVE` with reason `PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE`;
- `REJECT` with a bounded rejection reason.

Approval means only:

```text
ADMITTED_AWAITING_SEPARATE_EXECUTION
```

It does not authorize execution. A later bounded execution layer must separately validate the admission receipt and explicitly authorize the actual service run.

## Append-only receipts

Each decision receipt includes:

- a monotonically increasing sequence number;
- the previous receipt SHA-256, or `null` for the first receipt;
- the admission request ID;
- quote, service, requester, and operator bindings;
- the decision and reason code;
- the decision timestamp;
- a deterministic receipt SHA-256.

The verifier rejects reordered receipts, broken previous-hash links, duplicate decisions for the same admission request, modified receipt bodies, and invalid decision semantics.

The module returns an immutable in-memory chain. Persistent append-only storage remains the responsibility of a later integration layer.

## Permanent disabled controls

Every admission request states:

- automatic admission is disabled;
- payment collection is disabled;
- automatic execution is disabled;
- Work Credit mutation is disabled;
- treasury access is disabled.

Every decision receipt states:

- the receipt is append-only;
- payment collection is disabled;
- execution is not authorized;
- automatic execution is disabled;
- Work Credit mutation is disabled;
- treasury access is disabled.

## Explicit exclusions

This lane does not:

- modify `src/index.ts`;
- add HTTP routes;
- change the public UI;
- connect to a payment provider;
- move customer or treasury funds;
- access wallets, signers, or private keys;
- execute DataNet work;
- award, debit, or settle Work Credits;
- deploy or restart services;
- write receipts to disk or a database.

## Next bounded integration

After independent review and merge, the next layer may add an operator-owned append-only admission journal or a read-only admission-status surface. Execution must remain a separate explicit boundary and must consume a valid approved receipt rather than treating payment evidence alone as authorization.

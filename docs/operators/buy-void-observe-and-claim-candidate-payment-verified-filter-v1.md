# Buy VOID observe-and-claim candidate payment-verified filter V1

## Purpose

The observe-and-claim readiness lane must identify a request as eligible only
when the canonical server-derived public projection reports
`public_status: "payment_verified"`.

The orchestrator dry-run and activation-plan checks remain necessary, but they
are not sufficient by themselves. Historical requests can retain valid dry-run
plans after later becoming unpaid or rejected.

## Eligibility rule

A request is eligible only when all existing readiness conditions pass and its
server-derived public status is exactly `payment_verified`.

The following statuses are not eligible:

- `awaiting_payment_tx_hash`
- `payment_submitted_pending_manual_review`
- `rejected`
- missing or unknown status
- any terminal state that is not `payment_verified`

## Historical safety

This filter does not delete or rewrite historical requests. It does not append
operator events, alter sale accounting, or create a fulfillment claim.

It also does not select a request by operator override. The exact-one result
must emerge from canonical state after ineligible historical records are
filtered by the same deterministic rule.

## Regression scenario

The production-discovered six-record scenario is represented in the proof:

- one unpaid historical request;
- four rejected historical requests;
- one real `payment_verified` request.

The expected readiness result is exactly one eligible request, with the real
verified request recommended by ID and plan fingerprint.

## Authority boundary

This change has no authority to:

- mutate the public request journal;
- write the claim journal;
- consume approval;
- access credentials or a wallet;
- sign or broadcast;
- enable automatic fulfillment;
- deliver or move VOID.

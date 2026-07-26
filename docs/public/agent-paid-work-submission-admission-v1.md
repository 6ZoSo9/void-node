# VOID Agent Paid Work Submission Admission V1

Marker: `VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1`

## Purpose

This lane evaluates one existing Agent Paid Work Order Envelope V1 against one
explicit bounded admission policy. It returns one deterministic result:

- `accepted_for_review`
- `rejected`

An accepted result means only that the work order passed the mechanical intake
policy and may enter a separate operator/provider review queue.

It does not select a provider, does not create a quote, does not authorize payment, does not dispatch work, and does not write Work Credits.

## Inputs

The evaluator consumes:

1. one valid `VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1`;
2. one `VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_V1`;
3. one explicit UTC evaluation timestamp.

The work order remains content-addressed by its existing `voidawo1_` ID. The
admission decision receives a separate deterministic `voidawsa1_` ID.

## Policy checks

V1 checks:

- order creation and expiry relative to the explicit evaluation time;
- maximum order lifetime;
- capability allowlist;
- quote-asset allowlist;
- exact decimal maximum by asset without floating-point comparison;
- runtime and output-byte limits;
- input-reference and expected-output counts;
- inherited work-order validity requiring HTTPS callbacks without embedded
  credentials or fragments;
- callback loopback and private-IP-literal prohibition;
- inherited no-side-effect, no-wallet, and no-money-movement constraints.

Invalid work-order envelopes are rejected by the existing work-order contract
before this admission evaluator runs. Their structural failures are not
misreported as admission-policy reason codes.

Rejection reason codes are sorted and deterministic.

## Authority boundary

`accepted_for_review` grants no provider selection, quote creation, payment,
work execution, dispatch, WC award, WC-ledger write, wallet/signer access, or
Buy VOID fulfillment authority.

This lane adds no public HTTP route, runtime registration, service, deployment,
persistent queue, webhook, external callback, payment executor, work executor,
or ledger adapter.

## CLI

Validate a policy:

```bash
npx tsx scripts/agent_paid_work_submission_admission_v1.ts \
  policy-check admission-policy.json
```

Evaluate without overwriting an existing output:

```bash
npx tsx scripts/agent_paid_work_submission_admission_v1.ts \
  evaluate work-order.json admission-policy.json \
  2026-07-25T23:00:00Z admission-result.json
```

Recompute and verify a result:

```bash
npx tsx scripts/agent_paid_work_submission_admission_v1.ts \
  verify work-order.json admission-policy.json \
  2026-07-25T23:00:00Z admission-result.json
```

## Activation boundary

A later lane may expose this evaluator through a bounded authenticated runtime
route and append accepted submissions to an isolated review queue. That later
lane must separately prove authentication, request-size limits, rate limits,
append-only storage, idempotency, operator review, and deployment.

V1 performs no runtime submission and no live economic execution.

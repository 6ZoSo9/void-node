# VOID Public Agent Service Order Submission V1

Marker: `VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1`

Output marker: `VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1`

## Purpose

This adapter connects the catalog-bound Public Agent Service Order Adapter V1
to the existing authenticated Agent Paid Work Submission Intake V1.

The input contains a catalog-aware order request and a caller-selected
submission nonce. The adapter materializes the existing deterministic work
order and emits the receiver's existing four-field submission request:

```text
marker
version
submission_id
work_order
```

It does not create a competing submission wire format.

## Deterministic submission identity

`submission_id` is:

```text
voidawsr1_ + sha256(canonical_json({
  marker,
  version,
  submission_nonce,
  catalog_fingerprint_sha256,
  service_id,
  work_order_id
}))
```

Changing the submission nonce changes only the submission identity. Changing
the requested work changes both the work-order identity and submission
identity.

## Existing intake route

The compatible route is:

```text
POST /__void/agents/paid-work/submissions/v1
```

The route remains disabled unless its dedicated loopback receiver is
configured. The existing receiver separately requires authentication with the
`agent_paid_work_submit` scope and verifies the exact request-body SHA-256.

This adapter does not make an HTTP request, read a credential, create a
credential, or activate the route.

## Authority boundary

Materializing a submission request does not:

- select a provider;
- create or accept a quote;
- authorize or execute payment;
- authorize execution;
- dispatch work;
- award or write Work Credits;
- access a wallet or signer;
- sign or broadcast a transaction;
- move money;
- mutate runtime or service configuration.

The embedded work order continues to require payment before execution and
locks external side effects, wallet access, and money movement false.

## CLI

Materialize a receiver-compatible request:

```bash
npx tsx scripts/public_agent_service_order_submission_v1.ts \
  materialize \
  examples/public-agent-service-order-submission-v1.example.json \
  /tmp/agent-paid-work-submission-request.json
```

Verify an existing request against the catalog-bound input:

```bash
npx tsx scripts/public_agent_service_order_submission_v1.ts \
  verify \
  examples/public-agent-service-order-submission-v1.example.json \
  /tmp/agent-paid-work-submission-request.json
```

The output file is created exclusively with owner-private mode `0600`. It
contains no bearer token or other credential material.

## Verification

```bash
npx tsx scripts/prove_public_agent_service_order_submission_v1.ts
```

The proof covers deterministic order and submission identities, exact receiver
request shape, catalog-fingerprint binding, non-orderable service rejection,
stale-catalog rejection, unsafe nonce rejection, tamper rejection, existing
receiver schema compatibility, full-history CI, and all false-authority
boundaries.

## Files

- `schemas/public-agent-service-order-submission-v1.schema.json`
- `examples/public-agent-service-order-submission-v1.example.json`
- `docs/public-agent/public-agent-service-order-submission-v1.md`
- `scripts/public_agent_service_order_submission_v1.ts`
- `scripts/prove_public_agent_service_order_submission_v1.ts`
- `.github/workflows/public-agent-service-order-submission-v1.yml`

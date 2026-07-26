# VOID Agent Paid Work Submission Intake Runtime V1

Marker: `VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_GATEWAY_SOURCE_V1`

## Purpose

This source-only lane composes the existing Agent Paid Work Order Envelope V1
and Agent Paid Work Submission Admission V1 into a bounded external submission
intake.

It adds:

- one loopback-only receiver;
- one exact authenticated public-gateway proxy route;
- append-once intake receipts;
- deterministic duplicate suppression;
- deterministic conflicting-duplicate rejection;
- a disabled example configuration and systemd integration.

The public route is:

```text
POST /__void/agents/paid-work/submissions/v1
```

The route remains disabled by default. The gateway exposes it only when
`VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM` is explicitly configured.
The receiver itself refuses to start unless its local configuration has
`enabled=true`.

## Request

A request contains:

- marker `VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1`;
- version `1`;
- a caller-selected bounded `submission_id`;
- one valid `VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1`.

The gateway and receiver independently enforce:

- `application/json`;
- maximum 65,536-byte request bodies by default;
- exact bearer authorization syntax;
- exact `x-void-payload-sha256` binding;
- no query string or fragment;
- exact POST-only routing.

The receiver verifies the bearer token against a local mode-0600 token file
using a timing-safe comparison. It accepts only loopback sources.

## Admission result

The receiver loads one operator-controlled local admission policy. External
callers cannot replace or widen that policy.

The receiver evaluates the work order using
`materializeAgentPaidWorkSubmissionAdmissionV1`.

A mechanically valid order produces one of:

- `accepted_for_review`;
- `rejected`.

`accepted_for_review` means only that the submission may enter a separate
review process. It does not select a provider, does not create a quote, does not authorize payment,
does not execute payment, does not authorize execution, does not dispatch work,
and does not write Work Credits.

## Append-only state

The receiver stores:

- one receipt named by deterministic `voidawsi1_` receipt ID;
- one submission index named by `submission_id`.

An identical semantic duplicate returns the existing receipt. Different JSON
formatting does not create another receipt because duplicate comparison uses a
canonical request hash.

Reusing a `submission_id` for different request content returns `409` and
writes no additional receipt.

Receipts preserve the raw payload SHA-256 and the canonical request SHA-256.
They record authorization verification and loopback origin without recording
the bearer token.

## Gateway response boundary

The gateway:

- follows no redirect;
- strips `Location`, `Set-Cookie`, hop-by-hop, and proxy-authentication
  response headers;
- bounds the upstream response size;
- does not expose a generic proxy;
- keeps the existing operator-notification route independently configured.

## Source-only activation boundary

This lane creates and verifies source artifacts only.

It does not:

- install or enable either example systemd unit;
- create a bearer token;
- create a live configuration;
- restart the AI-agent gateway;
- restart the VOID node or private RPC;
- deploy the receiver;
- activate the public POST route;
- submit a real work order;
- select a provider;
- create a quote;
- authorize or execute payment;
- authorize or dispatch work;
- authorize a WC award;
- write a WC ledger;
- access a wallet or signer;
- mutate Buy VOID.

A later activation lane must separately install an immutable receiver release,
create segregated credentials and state, run a loopback authenticated canary,
install the gateway drop-in, restart only the gateway, and run an external
unauthorized canary before any real submission is invited.

## Files

- `scripts/agent_paid_work_submission_receiver_v1.ts`
- `scripts/prove_agent_paid_work_submission_intake_runtime_v1.ts`
- `scripts/prove_agent_paid_work_submission_gateway_integration_v1.mjs`
- `scripts/prove_agent_paid_work_submission_intake_guard_v1.mjs`
- `schemas/agent-paid-work-submission-request-v1.schema.json`
- `schemas/agent-paid-work-submission-intake-receipt-v1.schema.json`
- `fixtures/agent-paid-work/agent-paid-work-submission-request-v1.example.json`
- `fixtures/agent-paid-work/agent-paid-work-submission-intake-config-v1.example.json`
- `examples/systemd/void-agent-paid-work-submission-receiver-v1.service`
- `examples/systemd/void-ai-agent-public-gateway-v1.service.d/70-agent-paid-work-submission-receiver-v1.conf`

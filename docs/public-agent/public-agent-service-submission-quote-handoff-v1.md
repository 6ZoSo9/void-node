# VOID Public Agent Service Submission Quote Handoff V1

Marker: `VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_V1`

Downstream quote marker: `VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1`

## Purpose

This adapter binds one catalog-derived work order and one authenticated,
accepted-for-review submission receipt into a deterministic provider-facing
quote handoff packet.

The packet tells a prospective provider exactly which existing quote contract
to use and which work-order constraints cannot be exceeded. It does not select
a provider, does not generate a quote, does not set a price, and does not
resolve a payment rail.

## Required evidence

The input contains:

- the existing Public Agent Service Order Submission V1 input;
- one existing Agent Paid Work Submission Intake Receipt V1;
- an evidence mode;
- a bounded handoff creation time, expiry, and nonce.

The receipt must:

- match the deterministic `submission_id` and `work_order_id`;
- bind the exact canonical request SHA-256;
- report `authorization_verified=true`;
- use credential-registry authentication with scope
  `agent_paid_work_submit`;
- report admission decision `accepted_for_review`;
- preserve every provider, quote, payment, dispatch, wallet, mutation, and
  Work Credit authority as false.

An example fixture produces packet status `example_only`. Only
`evidence_mode=external_receiver_receipt` produces
`ready_for_provider_quote`. The mode is descriptive; consumers must still
verify the receipt came from the intended receiver and storage domain.

## Quote handoff packet

The packet contains:

- catalog, service, capability, work-order, submission, request, receipt, and
  admission bindings;
- the exact existing quote schema and materializer paths;
- the fields a provider must supply;
- the requester’s quote asset and maximum total;
- maximum runtime and output bytes;
- required output labels;
- false external-side-effect, wallet, and money-movement locks;
- separate acceptance and payment-before-execution requirements;
- a deterministic `voidawqh1_` handoff ID.

The packet does not contain a provider ID, price, payment destination,
invoice, wallet address, signature, transaction, or execution instruction.

## Existing quote contract

A provider may separately create a draft and use:

```bash
npx tsx scripts/agent_paid_work_quote_envelope_v1.ts \
  materialize \
  work-order.json \
  provider-quote-draft.json \
  provider-quote-envelope.json
```

The existing quote materializer separately verifies exact work-order,
capability, asset, ceiling, time-window, output, and safety bindings and
computes the deterministic `voidawq1_` quote ID.

This adapter does not call that materializer and does not generate a quote.

## Authority boundary

Materializing a handoff packet grants no authority to:

- select or authenticate a provider;
- create or accept a quote;
- authorize or execute payment;
- authorize or dispatch work;
- access a wallet or signer;
- sign or broadcast a transaction;
- write Work Credits;
- submit an HTTP request;
- create or change credentials;
- mutate runtime or service configuration;
- move money.

## CLI

Materialize:

```bash
npx tsx scripts/public_agent_service_submission_quote_handoff_v1.ts \
  materialize \
  examples/public-agent-service-submission-quote-handoff-v1.example.json \
  /tmp/public-agent-service-submission-quote-handoff-v1.json
```

Verify:

```bash
npx tsx scripts/public_agent_service_submission_quote_handoff_v1.ts \
  verify \
  examples/public-agent-service-submission-quote-handoff-v1.example.json \
  /tmp/public-agent-service-submission-quote-handoff-v1.json
```

The output file is created exclusively with mode `0600`.

## Verification

```bash
npx tsx scripts/prove_public_agent_service_submission_quote_handoff_v1.ts
```

The proof covers exact submission and receipt binding, credential-registry
scope, accepted admission, all-false authority, deterministic packet identity,
canonical key-order stability, evidence-mode truth, mismatch rejection,
tamper rejection, existing quote-contract compatibility, and the separate
acceptance and payment-intent authority boundaries.

## Files

- `schemas/public-agent-service-submission-quote-handoff-v1.schema.json`
- `examples/public-agent-service-submission-quote-handoff-v1.example.json`
- `docs/public-agent/public-agent-service-submission-quote-handoff-v1.md`
- `scripts/public_agent_service_submission_quote_handoff_v1.ts`
- `scripts/prove_public_agent_service_submission_quote_handoff_v1.ts`
- `.github/workflows/public-agent-service-submission-quote-handoff-v1.yml`

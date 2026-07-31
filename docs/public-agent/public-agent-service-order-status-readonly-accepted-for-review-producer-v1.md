# Public Agent Service Order Status Read-Only Accepted-for-Review Producer V1

## Purpose

This contract derives the first externally visible order-status source from three canonical paid-work producer documents:

1. the submission request;
2. its byte-semantically identical standalone work-order envelope;
3. the first authorized, non-duplicate submission-intake receipt.

The result is the canonical `accepted_for_review` source consumed by the existing order-status materializer and read-only route chain.

## Required bindings

The producer requires:

- request marker `VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1`;
- work-order marker `VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1`;
- receipt marker `VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1`;
- admission marker `VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1`;
- exact equality between the request's nested work order and the standalone work order;
- exact submission and work-order identity agreement;
- `authorization_verified: true`;
- `duplicate: false`;
- admission decision `accepted_for_review`;
- all receipt and admission authority fields false;
- monotonic creation, evaluation, receipt, and expiry timestamps.

The observation time is the canonical receipt `received_at_utc`.

## Produced source

The produced source has:

```text
submission_status=accepted_for_review
quote_status=none
acceptance_status=none
payment_status=none
execution_status=none
completion_status=none
```

Only `submission_receipt_id` is populated. Every later evidence field, including `quote_id`, is forced to `null`, even if later state exists elsewhere. This keeps the snapshot truthful to the accepted-for-review observation time.

The derived public phase is:

```text
phase=accepted_for_review
next_action=await_provider_quote_handoff
```

## CLI

The pure evaluator reads one input packet and writes canonical JSON to standard output:

```bash
node tools/void-public-agent-service-order-status-readonly-accepted-for-review-producer-v1.mjs   evaluate   --input producer-input.json
```

It has no output-file option.

## Authority boundary

This source-only contract has no authority to write the dedicated source root, configure or enable the HTTP integration, register a route, create a listener, submit paid work, select or authenticate a provider, accept a quote, execute payment, dispatch work, write Work Credits, mutate runtime state, restart a service, deploy, or activate.

A later, separately confirmed executor must re-read exact pinned producer documents, re-run this contract and the canonical materializer, and perform an atomic no-overwrite publication into the dedicated source root.

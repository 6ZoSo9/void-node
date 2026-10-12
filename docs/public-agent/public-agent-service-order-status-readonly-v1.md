# Public Agent Service Order Status Readonly V1

## Purpose

An external agent that submits paid work needs a deterministic way to understand
what happened next without receiving execution, payment, quote-acceptance, Work
Credit, or runtime authority.

This lane defines a normalized, read-only status object for one paid-work order.
It consumes a bounded lifecycle snapshot and emits only identifiers, normalized
states, a derived phase, the next required action, and cryptographic provenance.
It does not read credentials or raw provider payloads.

## Commands

Create a status object:

```bash
node tools/void-public-agent-service-order-status-readonly-v1.mjs materialize   source.json   status.json
```

Verify a previously materialized status object:

```bash
node tools/void-public-agent-service-order-status-readonly-v1.mjs verify   source.json   status.json
```

Write the canonical example:

```bash
node tools/void-public-agent-service-order-status-readonly-v1.mjs example   examples/public-agent-service-order-status-readonly-v1.example.json
```

## Source contract

The source object uses marker
`VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_SOURCE_V1`. It identifies one
`submission_id` and one `work_order_id`, supplies an explicit observation time,
and normalizes six lifecycle states:

1. submission
2. provider quote
3. requester acceptance
4. payment
5. execution
6. completion

Evidence fields contain identifiers only. Raw submissions, quotes, credentials,
headers, tokens, payment data, work output, and private callback material are not
part of the status contract.

## Derived phases

The tool derives exactly one phase:

- `accepted_for_review`
- `ready_for_provider_quote`
- `provider_authentication_required`
- `quote_available`
- `requester_accepted`
- `payment_authorized`
- `payment_confirmed`
- `execution_authorized`
- `dispatched`
- `completed`
- `rejected`
- `failed`

The source must be monotonic. For example, payment cannot be confirmed before
requester acceptance, execution cannot be authorized before payment
confirmation, and completion cannot exist before dispatch.

## Current dry-run interpretation

A provider response with `provider_authentication_required` derives:

```text
phase=provider_authentication_required
next_action=capture_real_provider_selection_and_authentication_prerequisite
terminal=false
```

This is status visibility only. It does not select or authenticate a provider.

## Determinism and provenance

The output contains:

- `source_sha256`, over the canonical source object;
- `status_id`, derived from the canonical normalized status basis;
- an exact evidence-reference count;
- fixed all-false authority fields.

The same source object always produces the same status object.

## Safety boundary

The tool may read one source JSON file and write one status JSON file. It
performs no authenticated submission, provider selection, provider
authentication, quote publication, quote acceptance, payment authorization,
payment execution, work authorization, dispatch, Work Credit write, runtime
mutation, restart, deployment, wallet access, or token-byte read.

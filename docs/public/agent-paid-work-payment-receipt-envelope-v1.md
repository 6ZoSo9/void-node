# VOID Agent Paid Work Payment Receipt Envelope V1

Marker: `VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1`

## Purpose

This lane defines a deterministic receipt for a successful payment execution
under one exact Agent Paid Work payment-execution authorization.

It binds the complete paid-work lineage, requester, provider, executor,
authorizer, resolver records, actual service amount, actual fee, total paid,
opaque rail receipt, payment evidence digest, and authorization-consumption
record into one content-addressed envelope.

V1 records a successful executor outcome only. It does not execute payment,
expose a raw destination, access a wallet or signer, create a transaction
signature, independently confirm settlement, or authorize work execution.

## Lifecycle boundary

1. The requester creates a work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. The requester creates a payment intent.
5. An authenticated authority grants bounded payment-execution authority.
6. A payment executor consumes that authorization once.
7. The executor creates this payment receipt.
8. A separate independent payment-confirmation lane verifies settlement.
9. Work execution remains separately authorized only after confirmation.

V1 covers step 7 only.

## Evidence boundary

The receipt contains opaque identifiers and a SHA-256 evidence digest:

- `executor_attempt_id`
- `authorization_consumption_id`
- `rail_receipt_id`
- `payment_evidence_sha256`

These are not wallet addresses, account numbers, transaction payloads, private
keys, or payment destinations. The content-derived receipt ID proves payload
integrity, not executor authorship or independent settlement confirmation.

A downstream confirmer must authenticate the executor, verify its signature,
resolve the opaque rail receipt through an allowlisted rail, verify the evidence
digest, and independently confirm that settlement reached the provider-bound
destination.

## Financial and replay boundaries

The validator enforces:

- Exact work-order, quote, acceptance, payment-intent, and authorization IDs
- Exact requester, provider, executor, authorizer, resolver, and policy bindings
- Execution within the authorization window
- Observation at or after execution and no more than 300 seconds later
- Exact service total from the authorization
- Actual fee at or below the authorized fee ceiling
- `payment_total = service_total + actual_fee_total`
- Payment total at or below the authorized maximum and work-order maximum
- Exact rail, rail-resolution, and provider-destination binding identifiers
- One-time use, atomic consumption, replay, and duplicate-payment verification
- Current, unrevoked, unsuperseded resolution records revalidated at execution
- Unused fee allowance remains uncharged
- Independent payment confirmation remains required
- Work-execution authority remains separate and ungranted

## Deterministic identity

`payment_receipt_id` is:

```text
voidawper1_ + sha256(canonical_json(draft_without_payment_receipt_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## CLI

Materialize:

```bash
npx tsx scripts/agent_paid_work_payment_receipt_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json \
  receipt-draft.json \
  receipt-envelope.json
```

Verify:

```bash
npx tsx scripts/agent_paid_work_payment_receipt_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json \
  receipt-envelope.json
```

Proof:

```bash
npx tsx scripts/prove_agent_paid_work_payment_receipt_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1_PROOF_GREEN
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, execute or
retry payment, expose or resolve raw destinations, access a wallet or signer,
create or broadcast a transaction, independently confirm settlement, authorize
work execution, award WC, settle WC to VOID, or activate Buy VOID fulfillment.

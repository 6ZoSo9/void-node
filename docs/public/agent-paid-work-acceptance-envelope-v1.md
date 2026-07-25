# VOID Agent Paid Work Acceptance Envelope V1

Marker: `VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1`

## Purpose

This lane defines the requester-side acceptance of one exact
`VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1` quote for one exact
`VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1` work order.

The acceptance is deterministic and content-addressed. It records that the
requester accepts the quoted commercial terms, provider identity claim,
capability, payment-rail registry key, and bounded time window. It creates a
machine-readable handoff for later authenticated payment authorization.

## Lifecycle boundary

The paid-work lifecycle remains split:

1. The requester creates a bounded work order.
2. A provider returns a quote bound to that work order.
3. The requester creates an acceptance bound to both exact IDs.
4. A separate authenticated payment authorization may follow.
5. A separate payment confirmation and execution authorization may follow.
6. Execution and result receipts occur only in later guarded lanes.

V1 covers step 3 only.

An acceptance is not a payment instruction and is not an execution instruction.
It grants no authority to debit funds, resolve a payment destination, access a
wallet, move money, execute work, perform external side effects, mutate Work
Credits, settle WC to VOID, fulfill Buy VOID, or change validator state.

## Authentication boundary

The content-derived `acceptance_id` proves payload integrity, not authorship.
Both requester and provider identities remain declarative until authenticated
by a separately signed transport or signed-envelope mechanism.

The acceptance therefore requires:

- `requester_authentication_required=true`
- `provider_authentication_required=true`
- `separate_payment_authorization_required=true`
- `separate_execution_authorization_required=true`
- `payment_authorization_granted=false`
- `execution_authorization_granted=false`

A downstream system must reject an unauthenticated acceptance.

## Deterministic identity

`acceptance_id` is:

```text
voidawa1_ + sha256(canonical_json(draft_without_acceptance_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding. Any change to either bound ID,
identity, commercial term, time window, authorization boundary, or nonce
changes the acceptance ID.

## Binding rules

Materialization and verification require the corresponding work order and quote.
The implementation enforces:

- Exact `work_order_id` equality
- Exact `quote_id` equality
- Exact requester agent identity from the work order
- Exact provider and capability identity from the quote
- Exact quote asset, total, and opaque payment-rail registry key
- Acceptance creation no earlier than quote creation
- Acceptance expiry no later than quote or work-order expiry
- Provider authentication remains required
- Requester authentication remains required
- Payment and execution authorization remain separate and ungranted

## CLI

Materialize an acceptance:

```bash
npx tsx scripts/agent_paid_work_acceptance_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  acceptance-draft.json \
  acceptance-envelope.json
```

Verify an acceptance:

```bash
npx tsx scripts/agent_paid_work_acceptance_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  acceptance-envelope.json
```

Run the focused proof:

```bash
npx tsx scripts/prove_agent_paid_work_acceptance_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1_PROOF_GREEN
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, authenticate
a live requester or provider, resolve payment details, create an invoice, debit
funds, receive funds, access a wallet or signer, broadcast a transaction,
execute work, deliver outputs, award WC, settle WC to VOID, or activate Buy
VOID fulfillment.

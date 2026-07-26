# VOID Agent Paid Work Payment Intent Envelope V1

Marker: `VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1`

## Purpose

This lane defines a bounded requester payment intent for one exact accepted
Agent Paid Work quote. It binds the work order, quote, acceptance, requester,
provider, asset, exact service total, maximum fee, payment-rail registry key,
and validity window into one deterministic envelope.

The intent gives a later authenticated payment-execution lane enough information
to evaluate a one-time payment request. It does not resolve a destination,
reserve funds, debit funds, sign a transaction, broadcast a payment, confirm a
payment, or authorize work execution.

## Lifecycle boundary

1. The requester creates a bounded work order.
2. A provider returns a quote.
3. The requester accepts that exact quote.
4. The requester creates a bounded payment intent.
5. A separate authenticated payment-execution lane may resolve an allowlisted
   rail and destination and execute at most the authorized amount.
6. A separate payment receipt and work-execution authorization must follow.

V1 covers step 4 only.

`payment_authorization_requested=true` records intent, not completed authority.
The envelope requires separate payment execution and keeps
`payment_execution_granted=false`. It also keeps work execution separate and
ungranted.

## Financial boundaries

The validator enforces:

- Exact quote total; the intent cannot alter the provider's price
- Exact quote asset and opaque payment-rail registry key
- `total + max_fee_total <= work_order.max_total` using decimal-string math
- `max_fee_total` is a ceiling, not an automatic charge
- Actual fee evidence is required; unused fee allowance must not be charged
- One-time use and replay protection
- At most one active payment intent per acceptance
- Requester and provider authentication before downstream use
- Destination resolution through an authenticated allowlisted rail
- The resolved destination must be bound to the quoted provider
- The selected rail must support the quoted asset
- Executed payment amount must not exceed `total + max_fee_total`
- Payment confirmation is required before work execution
- No wallet address, destination URI, invoice, or transaction payload field
- No payment receipt, funds transfer, or funds reservation claim
- No payment-execution or work-execution authority

The content-derived ID proves payload integrity, not authorship. A downstream
executor must authenticate the requester, atomically consume the intent ID,
verify actual fee evidence, bind the resolved destination to the provider and
asset-compatible rail, and reject expired, replayed, superseded, or concurrently
active intents. Any unused fee allowance remains unspent.

## Deterministic identity

`payment_intent_id` is:

```text
voidawpi1_ + sha256(canonical_json(draft_without_payment_intent_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## CLI

Materialize:

```bash
npx tsx scripts/agent_paid_work_payment_intent_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  payment-intent-draft.json \
  payment-intent-envelope.json
```

Verify:

```bash
npx tsx scripts/agent_paid_work_payment_intent_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  payment-intent-envelope.json
```

Proof:

```bash
npx tsx scripts/prove_agent_paid_work_payment_intent_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1_PROOF_GREEN
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, authenticate a
live requester or provider, resolve a wallet or payment destination, reserve or
debit funds, access a wallet or signer, create or broadcast a transaction,
confirm payment, execute work, deliver outputs, award WC, settle WC to VOID, or
activate Buy VOID fulfillment.

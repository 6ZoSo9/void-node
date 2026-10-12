# VOID Agent Paid Work Quote Envelope V1

Marker: `VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1`

## Purpose

This lane defines the provider-side commercial response to a validated
`VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1` request. It lets VOID or another
admitted provider return a deterministic quote that is bound to one exact work
order, one capability, one asset, one output commitment, and bounded execution
limits.

The quote is machine-readable and content-addressed. It gives an outside AI
agent enough information to decide whether to reject the quote or produce a
separate acceptance. It does not receive payment and does not start work.

## Lifecycle boundary

The paid-work lifecycle is intentionally split:

1. A requester creates a bounded paid work-order envelope.
2. A provider creates a quote bound to that exact work order.
3. The requester may create a separate acceptance.
4. A separately guarded payment rail may confirm payment.
5. Execution and result receipts occur only in later lanes.

V1 covers step 2 only. A quote grants no authority to execute, access a wallet,
move money, mutate Work Credits, fulfill Buy VOID, change validator state, or
perform external side effects.

`provider_id` is declarative. The content-addressed `quote_id` proves payload
integrity, not who sent it. Before acceptance, a consumer must authenticate the
provider through a separately signed transport or a later signed-envelope lane.

`payment_rail_id` is an opaque registry key only. It is not a URI, wallet,
payment destination, invoice, or authorization to pay. Resolution must occur
through a separately authenticated and allowlisted payment-rail registry.

## Deterministic identity

`quote_id` is:

```text
voidawq1_ + sha256(canonical_json(draft_without_quote_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding. The quote ID changes when any
commercial term, output commitment, execution limit, provider identity,
payment-rail identifier, expiry, or nonce changes.

## Work-order binding

Materialization and verification require the corresponding work-order envelope.
The implementation enforces:

- Exact `work_order_id` equality
- Exact capability equality
- Exact quote-asset equality
- `total` less than or equal to the requester's `max_total`
- Quote creation no earlier than work-order creation
- Quote expiry no later than work-order expiry
- Runtime and output-byte commitments within the requested limits
- Exact expected-output labels in the same order
- Provider authentication before acceptance
- Authenticated, allowlisted payment-rail resolution
- Payment before execution
- No wallet access
- No money movement
- No external side effects

Decimal comparison is performed directly on bounded decimal strings. It does
not use binary floating-point conversion.

## CLI

Materialize a quote:

```bash
npx tsx scripts/agent_paid_work_quote_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  quote-draft.json \
  quote-envelope.json
```

Verify a quote:

```bash
npx tsx scripts/agent_paid_work_quote_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  quote-envelope.json
```

Run the focused proof:

```bash
npx tsx scripts/prove_agent_paid_work_quote_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_PROOF_GREEN
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, select a live
provider, accept a quote, receive or escrow funds, expose payment destinations,
access a signer, broadcast a transaction, execute work, deliver outputs, award
WC, settle WC to VOID, or activate Buy VOID fulfillment.

# Authenticated paid-work quote acceptance and payment authority V1

Marker:
`VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_V1`

Output marker:
`VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_V1`

## Purpose

This lane composes one exact Agent Paid Work work order and provider quote into
an auditable requester-acceptance candidate and a bounded payment-intent
candidate.

It reuses the canonical contracts:

- `VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1`;
- `VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1`;
- `VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1`;
- `VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1`.

The packet records the exact acceptance ID and payment-intent ID that a later
authenticated atomic activation consumer must persist. It does not invent a
second acceptance format or a second payment format.

## Lifecycle boundary

The paid-work lifecycle remains separated:

1. A requester creates a bounded work order.
2. A provider returns one exact quote.
3. This lane materializes the canonical acceptance candidate.
4. This lane materializes the canonical bounded payment-intent candidate.
5. A later lane authenticates requester and provider evidence, atomically
   consumes replay IDs, enforces single-active records, and persists both
   artifacts.
6. A separate payment-execution authorization may then be issued.
7. Payment execution, payment confirmation, work-execution authorization,
   dispatch, result verification, WC writes, and settlement remain later gates.

V1 covers preparation of steps 3 and 4 only.

## Prepared content versus effective authority

The packet intentionally distinguishes deterministic content materialization
from effective economic authority.

Its status is `prepared_requires_authenticated_atomic_activation`.

It emits:

- `acceptance_candidate_materialized=true`;
- `quote_terms_recorded_as_accepted=true`;
- `payment_intent_candidate_materialized=true`;
- `payment_authorization_requested=true`.

It also emits:

- `effective_quote_acceptance=false`;
- `effective_payment_authorization=false`;
- `payment_execution_authorized=false`;
- `work_execution_authorization=false`;
- `work_dispatch=false`;
- `wallet_access=false`;
- `money_movement=false`.

The content-derived IDs prove payload integrity, not requester or provider
authorship. No downstream system may treat this prepare-only packet as an
activated acceptance, executable payment authorization, payment receipt, work
instruction, or funds reservation.

## Atomic activation requirements

A later activation consumer must verify and atomically record all of the
following before effective quote acceptance or payment authority can become
true:

- dedicated requester authentication for `agent_paid_work_accept`;
- provider authentication for the exact quote lineage;
- requester-authentication ID consumption;
- provider-authentication ID consumption;
- acceptance ID consumption;
- payment-intent ID consumption;
- one active acceptance per quote;
- one active payment intent per acceptance;
- one atomic persistence receipt covering the accepted lineage;
- expiry and supersession checks at activation time.

Partial persistence must grant no authority.

## Payment boundary

The payment-intent candidate binds:

- exact quote total;
- exact quote asset;
- exact payment-rail registry key;
- a maximum fee ceiling;
- `total + max_fee_total <= work_order.max_total`;
- one-time use and replay protection;
- destination resolution and provider binding requirements;
- a separate payment-execution authorization;
- payment confirmation before work execution.

The fee ceiling is not a charge. Unused fee allowance must remain unspent.

This lane does not materialize
`VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1` and does not
create a `payment_execution_authorization_id`.

## Deterministic packet ID

`packet_id` is:

```text
voidawqapa1_ + sha256(canonical_json(packet_without_packet_id))
```

Any change to the work order, quote, acceptance timing, payment-intent timing,
fee ceiling, controls, nonce, prepared artifacts, gate state, or authority
boundary changes the packet ID.

## CLI

Materialize:

```bash
npx tsx \
  scripts/authenticated_paid_work_quote_acceptance_payment_authority_v1.ts \
  materialize \
  examples/authenticated-paid-work-quote-acceptance-payment-authority-v1.example.json \
  /tmp/authenticated-paid-work-quote-acceptance-payment-authority-v1.json
```

Verify:

```bash
npx tsx \
  scripts/authenticated_paid_work_quote_acceptance_payment_authority_v1.ts \
  verify \
  examples/authenticated-paid-work-quote-acceptance-payment-authority-v1.example.json \
  /tmp/authenticated-paid-work-quote-acceptance-payment-authority-v1.json
```

Focused proof:

```bash
npx tsx \
  scripts/prove_authenticated_paid_work_quote_acceptance_payment_authority_v1.ts
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_V1_EXACT_GREEN
```

## Non-goals

This lane does not add or change a public HTTP route, mutate `src/index.ts`,
authenticate a production requester or provider, write replay state, persist an
acceptance, persist a payment intent, resolve a payment destination, authorize
or execute payment, access a wallet or signer, construct or broadcast a
transaction, confirm payment, authorize or dispatch work, award WC, write the
WC ledger, settle WC to VOID, fulfill Buy VOID, restart a service, or deploy a
runtime.

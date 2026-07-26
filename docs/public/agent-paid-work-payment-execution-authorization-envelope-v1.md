# VOID Agent Paid Work Payment Execution Authorization Envelope V1

Marker: `VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1`

## Purpose

This lane defines narrowly bounded authority for one authenticated payment
executor to execute one payment for one exact Agent Paid Work payment intent.

It binds the work order, quote, acceptance, payment intent, requester, provider,
executor, authenticated resolution records, asset, service total, fee ceiling,
maximum payment total, rail, and a short execution window into one deterministic
envelope.

This contract grants payment-execution authority within those exact limits. It
does not execute payment, expose a raw destination, access a wallet or signer,
construct or broadcast a transaction, confirm settlement, or authorize work
execution.

The content-derived authorization ID proves payload integrity, not authorship.
A downstream executor must authenticate an explicit `authority_id`, verify an
`authority_policy_id`, and verify a separately signed authorization before
treating the envelope as usable authority. The envelope itself is not a
transaction signature.

## Lifecycle boundary

1. The requester creates a bounded work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. The requester creates a payment intent.
5. An authenticated authority creates this bounded execution authorization.
6. A separate payment executor may consume it exactly once.
7. A separate payment receipt must confirm the outcome.
8. Work execution remains separately authorized only after payment confirmation.

V1 covers step 5 only.

## Opaque resolution boundary

`payment_rail_resolution_id` and `provider_destination_binding_id` are opaque
identifiers for separately authenticated records. They are not wallet
addresses, account numbers, payment URIs, invoice payloads, or transaction
payloads.

A downstream executor must resolve them through an authenticated allowlisted
registry and verify that:

- the destination is bound to the quoted provider;
- the rail supports the quoted asset;
- the authorizer, resolver, and executor identities are authenticated;
- authorizer, resolver, and executor identities satisfy separation of duties;
- the authorization is signed under the bound authority policy;
- neither record is expired, revoked, superseded, or replayed;
- both records are revalidated immediately before payment execution.

## Financial boundaries

The validator enforces:

- Exact work-order, quote, acceptance, and payment-intent IDs
- Exact requester and provider identities
- Exact service total and payment rail from the payment intent
- Authorization fee ceiling no greater than the payment-intent ceiling
- `max_payment_total = service_total + max_fee_total`
- `max_payment_total <= work_order.max_total`
- Short execution lifetime of at most 900 seconds
- One-time use, replay protection, atomic consumption, and duplicate-payment prevention
- At most one active execution authorization per payment intent
- Explicit authenticated authorizer and bound authority policy
- Authorizer, resolver, and executor separation of duties
- Current, unrevoked, unsuperseded resolution records
- Mandatory resolution revalidation at execution time
- Actual fee at or below the authorized ceiling with evidence
- Unused fee allowance must remain uncharged
- Payment receipt required after execution
- Payment confirmation required before any work-execution authorization
- No partial authority after a failed payment attempt
- Work-execution authority remains separate and ungranted

## Deterministic identity

`payment_execution_authorization_id` is:

```text
voidawpea1_ + sha256(canonical_json(draft_without_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## CLI

Materialize:

```bash
npx tsx scripts/agent_paid_work_payment_execution_authorization_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  authorization-draft.json \
  authorization-envelope.json
```

Verify:

```bash
npx tsx scripts/agent_paid_work_payment_execution_authorization_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  authorization-envelope.json
```

Proof:

```bash
npx tsx scripts/prove_agent_paid_work_payment_execution_authorization_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1_PROOF_GREEN
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, authenticate a
live executor or resolver, expose or resolve raw payment destinations, reserve
or debit funds, access a wallet or signer, create a transaction signature,
construct or broadcast a transaction, confirm payment, authorize work execution,
award WC, settle WC to VOID, or
activate Buy VOID fulfillment.

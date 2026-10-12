# VOID Agent Paid Work Independent Payment Confirmation Envelope V1

Marker: `VOID_AGENT_PAID_WORK_INDEPENDENT_PAYMENT_CONFIRMATION_ENVELOPE_V1`

## Purpose

This lane defines an independent confirmation that one exact paid-work payment
receipt represents settlement observed through an allowlisted payment rail.

It binds the complete paid-work lineage, the successful payment receipt,
requester, provider, executor, authorizer, resolver, independent confirmer,
confirmation policy, exact paid amounts, opaque rail evidence, and independent
observation evidence into one deterministic envelope.

The confirmation records settlement under a bound finality policy. It does not
execute or retry payment, expose a raw destination, access a wallet or signer,
create a transaction signature, or authorize work execution.

## Independence boundary

The confirmer must authenticate and sign the canonical confirmation. Its
`confirmer_id` must be distinct from the requester, provider, executor,
authorizer, and resolver identities. The content-derived confirmation ID proves
payload integrity, not confirmer authorship; downstream use requires signature
verification under the bound `confirmation_policy_id`.

## Verification boundary

The confirmer must independently:

- verify the successful receipt and executor signature;
- resolve the opaque rail receipt through an allowlisted rail;
- verify the receipt and payment evidence digest;
- verify the provider-bound destination and rail/asset compatibility;
- verify the exact service amount, actual fee, and payment total;
- observe settlement finality under the bound confirmation policy;
- confirm the settlement is neither reversed nor disputed at confirmation time.

A later reversal or dispute requires a separate dispute record. This immutable
confirmation cannot be silently rewritten or used as a work-execution
instruction.

## Replay and registry boundaries

The contract requires:

- At most one confirmation per successful payment receipt
- Unique independent-observation and settlement-reference identifiers
- Immutable confirmation evidence
- Replay protection
- Exact binding to the complete paid-work lineage and receipt
- Work-execution authority remains separate and ungranted

## Deterministic identity

`payment_confirmation_id` is:

```text
voidawpc1_ + sha256(canonical_json(draft_without_payment_confirmation_id))
```

## CLI

Materialize:

```bash
npx tsx scripts/agent_paid_work_independent_payment_confirmation_envelope_v1.ts \
  materialize \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json \
  examples/agent-paid-work-payment-receipt-envelope-v1.example.json \
  confirmation-draft.json \
  confirmation-envelope.json
```

Verify:

```bash
npx tsx scripts/agent_paid_work_independent_payment_confirmation_envelope_v1.ts \
  verify \
  examples/agent-paid-work-order-envelope-v1.example.json \
  examples/agent-paid-work-quote-envelope-v1.example.json \
  examples/agent-paid-work-acceptance-envelope-v1.example.json \
  examples/agent-paid-work-payment-intent-envelope-v1.example.json \
  examples/agent-paid-work-payment-execution-authorization-envelope-v1.example.json \
  examples/agent-paid-work-payment-receipt-envelope-v1.example.json \
  confirmation-envelope.json
```

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, execute or
retry payment, expose payment destinations, access wallets or signers, create or
broadcast transactions, authorize work execution, award WC, settle WC to VOID,
or activate Buy VOID fulfillment.

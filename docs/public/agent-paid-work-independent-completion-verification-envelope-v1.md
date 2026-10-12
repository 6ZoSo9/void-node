# VOID Agent Paid Work Independent Completion Verification Envelope V1

Marker: `VOID_AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_ENVELOPE_V1`

## Purpose

This lane defines a deterministic independent verification of one exact
paid-work completion receipt.

The verification binds the complete paid-work lineage, work-execution
authorization, completion receipt, verifier identity and policy, execution
subject, task commitments, observed result commitments, verification evidence,
individual check outcomes, final decision, and verifier-authentication evidence.

The verification determines whether the submitted completion receipt and its
committed evidence satisfy the authorized task and verification policy. It does
not mutate the receipt, execute work, award Work Credits, move money, access a
wallet, administer runtime state, or activate Buy VOID fulfillment.

## Lifecycle boundary

1. A requester creates a bounded paid-work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. A bounded payment intent is created.
5. Payment execution is narrowly authorized.
6. A successful payment receipt is recorded.
7. Settlement is independently confirmed.
8. One bounded work execution is authorized.
9. An executor records one completion receipt.
10. This envelope independently evaluates that exact completion receipt.
11. A separate downstream lane may authorize a WC award or another permitted
    settlement action only after a final verified result.

V1 covers step 10 only.

## Exact lineage and subject binding

The verification binds:

- `work_order_id`
- `quote_id`
- `acceptance_id`
- `payment_intent_id`
- `payment_execution_authorization_id`
- `payment_receipt_id`
- `payment_confirmation_id`
- `work_execution_authorization_id`
- `work_completion_receipt_id`

It also binds the executor, provider, execution identifier, execution status,
task type, task-spec commitment, input-manifest commitment, expected output
schema, result-delivery channel, and every observed result commitment.

A verification for one receipt, execution, task, provider, executor, input,
output schema, or evidence bundle cannot be reused for another.

## Verifier independence

The verifier must be independent from:

- the work executor
- the quoted provider
- the work-execution authorizer

The verifier identity must match the verifier signer identity and the exact
verifier named by the work-execution authorization.

Verifier authentication and signature verification are mandatory. The envelope
contains key identifiers and cryptographic commitments, not private keys, seed
phrases, wallet credentials, or unrestricted signing authority.

## Verification evidence

The verification commits to:

- the verification report
- the reproduction log
- the schema-validation report
- the policy-review report
- executor-signature verification evidence

These commitments make the verification auditable without embedding secrets or
mutable evidence inside the envelope.

Verification evidence must remain immutable after publication.

## Required checks

The verification records separate outcomes for:

- completion-receipt integrity
- execution-authorization binding
- executor signature
- task-spec binding
- input-manifest binding
- expected output schema
- result-payload schema validity
- output-manifest integrity
- evidence-bundle integrity
- resource-limit compliance
- policy-observation integrity
- completion-requirement satisfaction

A `verified` decision requires every check to be `true`.

## Decision states

The allowed decision states are:

- `verified`
- `rejected`
- `inconclusive`

### Verified

A verified decision requires:

- the completion receipt to report `succeeded`
- every verification check to pass
- `completion_verified=true`
- no failure-reason code
- `decision_final=true`

A verified result confirms that the exact receipt and committed evidence satisfy
the declared verification policy. It does not itself authorize a Work Credit
award, payment action, wallet action, or runtime mutation.

### Rejected

A rejected decision requires:

- `completion_verified=false`
- a specific failure-reason code
- `decision_final=true`

Rejected evidence must remain visible and must not be rewritten as a successful
verification.

### Inconclusive

An inconclusive decision requires:

- `completion_verified=false`
- a specific failure-reason code
- `decision_final=false`

An inconclusive result is not a failed verification and is not a successful
verification. A later verification requires a separate uniquely identified
verification process under the downstream registry policy.

## Finality and replay protection

The V1 envelope requires:

- one final verification per completion receipt
- replay protection
- immutable verification evidence
- immutable completion receipts
- no superseding verification identifier inside this envelope
- unique verification-run and verification-envelope identifiers

A final verified or rejected decision cannot be silently replaced. Any dispute,
appeal, governance action, or corrective process requires a separate explicit
record type.

## Receipt immutability

Independent verification reads and evaluates the completion receipt. It does
not modify, repair, redact, supersede, or delete the receipt.

A detected defect must be represented by a rejected or inconclusive decision
and immutable evidence, not by changing the original receipt.

## Work Credit and payment boundary

The verification explicitly preserves:

- `work_credit_award_separate=true`
- `verification_is_not_work_execution_instruction=true`
- `verification_is_not_work_credit_award_instruction=true`
- `verification_is_not_payment_instruction=true`
- `completion_receipt_mutation_authorized=false`
- `work_credit_award_authorized=false`
- `payment_mutation_authorized=false`
- `wallet_or_signer_access_authorized=false`
- `runtime_administration_authorized=false`
- `buy_void_fulfillment_authorized=false`

A verified decision may be a required input to a later WC-award authorization,
but it is not itself an award instruction.

## Deterministic identity

`independent_completion_verification_id` is:

```text
voidawicv1_ + sha256(canonical_json(draft_without_verification_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, execute work,
alter a completion receipt, award or settle Work Credits, move funds, modify
payment state, access a wallet or unrestricted signer, administer a node,
resolve disputes, or activate Buy VOID fulfillment.

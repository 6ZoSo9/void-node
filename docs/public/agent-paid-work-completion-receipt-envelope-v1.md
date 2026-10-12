# VOID Agent Paid Work Completion Receipt Envelope V1

Marker: `VOID_AGENT_PAID_WORK_COMPLETION_RECEIPT_ENVELOPE_V1`

## Purpose

This lane defines a deterministic executor receipt for one bounded paid-work
execution attempt after one exact work-execution authorization has been
consumed.

The receipt binds the complete paid-work lineage, execution authorization,
executor and provider identities, attempt outcome, timestamps, sandbox and
environment identity, task commitments, result commitments, measured resource
usage, observed policy behavior, and executor-authentication evidence.

The receipt records what the executor reports happened. It does not
independently prove that the result is correct, useful, complete, policy
compliant, or eligible for a Work Credit award.

## Lifecycle boundary

1. A requester creates a bounded paid-work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. A bounded payment intent is created.
5. Payment execution is narrowly authorized.
6. A successful payment receipt is recorded.
7. Settlement is independently confirmed.
8. One bounded work execution is authorized.
9. This envelope records one execution-attempt outcome.
10. A separate independent completion-verification lane evaluates the result.
11. A later settlement or WC-award lane may act only on separately authorized
    verified outcomes.

V1 covers step 9 only.

## Exact lineage binding

The receipt binds:

- `work_order_id`
- `quote_id`
- `acceptance_id`
- `payment_intent_id`
- `payment_execution_authorization_id`
- `payment_receipt_id`
- `payment_confirmation_id`
- `work_execution_authorization_id`

It also binds the executor, provider, task type, task-spec commitment, input
manifest, expected output schema, and result-delivery channel.

A receipt for one authorization, execution attempt, executor, task, input,
output schema, or provider cannot be reused as a receipt for another.

## Authorization consumption

`authorization_consumed=true` records that the exact work-execution
authorization was consumed for this attempt.

Downstream registries must enforce:

- atomic authorization consumption
- no authorization replay
- one receipt identity per execution attempt
- unique execution identifiers
- bounded attempt numbering
- immutable receipts after publication

A failed, timed-out, cancelled, or policy-rejected attempt still consumes the
one-time authorization unless a separate explicit retry authorization exists.

## Outcome states

The allowed execution states are:

- `succeeded`
- `failed`
- `timed_out`
- `cancelled`
- `policy_rejected`

A successful receipt requires exit code `0`, no failure-reason code, enforced
sandboxing, verified input integrity, observed capability and network
allowlists, observed resource limits, and no forbidden side effects.

A non-success receipt requires a failure-reason code. It may truthfully record
policy violations or forbidden effects that were observed.
Failed attempts must not be rewritten as clean successes.

## Result commitments

The receipt commits to:

- output manifest
- result payload
- standard output
- standard error
- execution log
- evidence bundle

These are cryptographic commitments only. The receipt does not assert that the
committed result matches the expected output schema, satisfies the requester,
or represents useful completed work.

## Resource usage

The receipt records measured:

- wall-clock seconds
- CPU seconds
- peak memory bytes
- output bytes
- network requests
- retry count

The completion-receipt validator must compare these measurements with the
limits in the exact work-execution authorization. A successful receipt cannot
exceed an authorized limit.

## Policy observation

The receipt records observed execution behavior, including whether:

- sandboxing was enforced
- input integrity was verified
- capability and network allowlists were observed
- resource limits were observed
- secrets or wallets were accessed
- payment, WC, Buy VOID, or runtime state was mutated
- the host filesystem was written
- unapproved external side effects occurred

For a successful receipt, all required safeguards must be true and all
forbidden effects must be false.

For unsuccessful attempts, these fields remain observations and may record
violations truthfully. The receipt must not suppress adverse evidence.

## Executor authentication

The executor-authentication block binds:

- executor signer identity
- signing-key identity
- signature scheme
- signed-payload commitment
- signature-evidence commitment

The signer identity must match the exact authorized executor. Signature
verification remains mandatory before accepting the receipt.

The envelope contains commitments and identifiers, not private keys, seed
phrases, wallet credentials, or unrestricted signer access.

## Verification boundary

The receipt explicitly preserves the following boundaries:

- `correctness_verified=false`
- `work_credit_award_authorized=false`
- `payment_instruction_authorized=false`
- `payment_state_mutation_authorized=false`
- `wallet_or_signer_access_authorized=false`
- `runtime_administration_authorized=false`
- `buy_void_fulfillment_authorized=false`
- `receipt_is_not_independent_completion_verification=true`
- `receipt_is_not_work_credit_award_instruction=true`
- `receipt_is_not_payment_instruction=true`

A `succeeded` execution status means only that the bounded executor process
reported a clean successful attempt. It does not independently prove correctness
and does not authorize payment, WC issuance, or settlement.

## Deterministic identity

`work_completion_receipt_id` is:

```text
voidawcr1_ + sha256(canonical_json(draft_without_receipt_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, launch real
work, independently verify completion, score usefulness, authorize or award
Work Credits, move funds, alter payment state, access a wallet or signer,
administer a node, write unrestricted host files, or activate Buy VOID
fulfillment.

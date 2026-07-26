# VOID Agent Paid Work Execution Authorization Envelope V1

Marker: `VOID_AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ENVELOPE_V1`

## Purpose

This lane defines a deterministic, bounded authorization for one exact paid-work
execution after one exact independent payment confirmation.

It binds the complete paid-work lineage, requester, provider, selected work
executor, authorizer, independent completion verifier, task commitments,
resource limits, capability allowlists, network allowlists, execution window,
and one-time authorization controls into one content-addressed envelope.

This contract grants bounded work-execution authority. It does not execute the
work, complete the work, verify completion, award Work Credits, move funds,
modify payment state, access a wallet, administer a runtime, or activate Buy
VOID fulfillment.

## Lifecycle boundary

1. A requester creates a bounded paid-work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. A bounded payment intent is created.
5. Payment execution is narrowly authorized.
6. A successful payment receipt is recorded.
7. Settlement is independently confirmed.
8. This envelope authorizes one exact bounded work execution.
9. A separate completion receipt records the executor outcome.
10. A separate independent completion-verification lane evaluates the result.

V1 covers step 8 only.

## Exact execution binding

The authorization binds:

- `payment_confirmation_id`
- `task_type`
- `task_spec_sha256`
- `input_manifest_sha256`
- `expected_output_schema_sha256`
- `result_delivery_channel_id`
- requester, provider, executor, authorizer, and completion-verifier identities
- authorizer and completion-verification policies
- a fixed creation and expiration window
- one exact nonce and content-derived authorization ID

The authorization cannot be reused for another payment confirmation, task,
input, output schema, executor, provider, delivery channel, or validity window.

## Resource limits

The executor must enforce all declared limits:

- wall-clock seconds
- CPU seconds
- memory bytes
- output bytes
- network-request count
- retry count

The example authorization allows at most one retry and requires a bounded
sandbox. Exceeding any limit must fail the execution rather than silently expand
authority.

## Capability and side-effect boundary

Only the listed capability and network-policy identifiers are allowed.

The V1 example explicitly requires:

- `sandbox_required=true`
- `secrets_allowed=false`
- `wallet_access_allowed=false`
- `payment_mutation_allowed=false`
- `work_credit_mutation_allowed=false`
- `buy_void_fulfillment_allowed=false`
- `runtime_administration_allowed=false`
- `host_filesystem_write_allowed=false`
- `external_side_effects_allowed=false`

The envelope contains policy identifiers, not secrets, wallet credentials,
private keys, unrestricted network destinations, or host-administration
authority.

## Identity and separation of duties

Downstream use requires authentication of the requester, provider, executor,
and authorizer, plus verification of the authorization signature and bound
authority policy.

The authorizer must be independent from the selected executor. The independent
completion verifier must be distinct from both the executor and authorizer.
Completion verification remains separate from work execution.

## Replay and consumption controls

The downstream authorization registry must enforce:

- one-time use
- replay protection
- atomic consumption
- at most one active work-execution authorization per payment confirmation
- exact provider/executor binding
- exact task-spec and input-integrity verification
- output commitment before completion acceptance

A consumed, expired, revoked, superseded, or concurrently active authorization
must be rejected.

## Completion boundary

The authorization requires a separate completion receipt and separate
independent completion verification.

It is not:

- a completion receipt
- work-completion confirmation
- a Work Credit award instruction
- a payment instruction

A successful execution does not itself prove useful or correct completion and
does not authorize a WC award.

## Deterministic identity

`work_execution_authorization_id` is:

```text
voidawwea1_ + sha256(canonical_json(draft_without_authorization_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, start work,
run a task, contact an external service, write to the host filesystem, access
secrets or wallets, alter payment state, award WC, settle WC to VOID,
administer a node, or activate Buy VOID fulfillment.

# VOID Agent Paid Work WC Award Authorization Envelope V1

Marker: `VOID_AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ENVELOPE_V1`

## Purpose

This lane defines a deterministic authorization for one bounded Work Credit
award after one exact paid-work completion has received a final independent
`verified` decision.

The authorization binds the complete paid-work lineage, independent completion
verification, beneficiary identities, destination WC account, award amount and
policy, ledger target, uniqueness key, expected ledger prestate, authorizer
identity and policy, signature evidence, validity window, and one-time
execution controls.

The envelope authorizes a future bounded WC ledger write. It does not itself
write the WC ledger, issue a ledger receipt, settle WC to VOID, move funds,
access a wallet, administer runtime state, or activate Buy VOID fulfillment.

## Lifecycle boundary

1. A requester creates a bounded paid-work order.
2. A provider returns a quote.
3. The requester accepts the quote.
4. A bounded payment intent is created.
5. Payment execution is narrowly authorized.
6. A successful payment receipt is recorded.
7. Settlement is independently confirmed.
8. One bounded work execution is authorized.
9. The executor records one completion receipt.
10. An independent verifier evaluates the exact completion receipt.
11. This envelope authorizes one bounded WC award for the final verified result.
12. A separate WC-ledger execution records the award and emits a ledger receipt.
13. A separate settlement process may later convert eligible WC to VOID.

V1 covers step 11 only.

## Exact verified-completion binding

The authorization binds:

- `work_order_id`
- `quote_id`
- `acceptance_id`
- `payment_intent_id`
- `payment_execution_authorization_id`
- `payment_receipt_id`
- `payment_confirmation_id`
- `work_execution_authorization_id`
- `work_completion_receipt_id`
- `independent_completion_verification_id`

The referenced independent verification must report:

- `decision_status=verified`
- `completion_verified=true`
- a final decision
- no failure-reason code
- all required verification checks passed

A rejected, inconclusive, non-final, superseded, mismatched, or unverified
completion cannot receive this authorization.

## Beneficiary binding

The authorization binds the verified executor and provider identities to one
exact `wc_account_id`.

The ledger destination account must equal the beneficiary WC account. The
beneficiary cannot substitute another account after authorization.

The authorizer must remain distinct from the beneficiary executor, provider,
and independent verifier.

## Award amount and policy

The award block binds:

- denomination `WC`
- positive integer award amount
- maximum authorized WC amount
- award reason code
- award policy identifier
- score-basis commitment

`amount_wc` must be greater than zero and must not exceed
`maximum_authorized_amount_wc`.

The example authorizes exactly 3 WC. It does not establish a universal award
rate for every paid-work task.

Any score calculation, policy version, or award amount change produces a new
authorization identity and requires a separately valid authorization.

## Ledger target

The authorization binds:

- exact WC ledger identifier
- entry type `earn`
- destination WC account
- uniqueness key derived from the independent verification
- expected ledger prestate commitment
- required ledger-receipt schema

The uniqueness key is:

```text
paid-work-verification:<independent_completion_verification_id>
```

A downstream ledger executor must reject duplicate, conflicting, stale-prestate,
expired, already-consumed, or replayed authorizations.

## One-time ledger execution

The downstream ledger-write lane must enforce:

- one-time use
- replay protection
- atomic ledger write
- one award per independent verification
- exact beneficiary binding
- exact award amount and cap
- expected-prestate validation
- uniqueness-key enforcement
- immutable ledger receipt

Authorization consumption and ledger mutation must occur atomically. A failed
or partial ledger write must not silently consume the authorization without an
auditable failure record.

## Authorizer authentication

The authorizer block binds:

- authority identity
- authority policy
- signing-key identity
- signature scheme
- signed-payload commitment
- signature-evidence commitment

The authorizer must authenticate under the exact bound policy before a ledger
executor accepts the authorization.

The envelope contains identifiers and cryptographic commitments, not private
keys, seed phrases, wallet credentials, or unrestricted signing authority.

## Separation of duties

The authorization requires separation between:

- authorizer and beneficiary executor
- authorizer and quoted provider
- authorizer and independent verifier
- authorization creation and ledger execution
- WC ledger write and WC→VOID settlement

The independent verifier confirms completion but does not authorize the ledger
write. The ledger executor applies an already valid authorization but does not
choose the award amount or beneficiary.

## Ledger receipt boundary

A successful downstream ledger write must produce a separate immutable ledger
receipt conforming to the bound receipt schema.

This authorization is not:

- a ledger entry
- a ledger receipt
- proof that the ledger write occurred
- a WC balance statement
- a WC→VOID settlement instruction
- a payment instruction

No WC is earned merely because the authorization envelope exists.

## WC→VOID settlement boundary

The authorization requires `wc_to_void_settlement_separate=true`.

A later WC→VOID settlement must independently verify the WC ledger state,
redeemable balance, settlement policy, conversion rules, destination, replay
controls, and settlement authorization.

This envelope grants no authority to debit WC, mint or transfer VOID, access a
wallet, sign a transaction, or move funds.

## Payment, wallet, runtime, and Buy VOID boundary

The authorization requires:

- `payment_mutation_forbidden=true`
- `wallet_access_forbidden=true`
- `runtime_administration_forbidden=true`
- `buy_void_fulfillment_forbidden=true`
- `authorization_is_not_ledger_write=true`
- `authorization_is_not_wc_to_void_settlement=true`
- `authorization_is_not_payment_instruction=true`

The WC award is an accounting authorization for verified work. It cannot be
repurposed as payment execution, wallet authority, node administration, or Buy
VOID fulfillment.

## Deterministic identity

`wc_award_authorization_id` is:

```text
voidawwcaa1_ + sha256(canonical_json(draft_without_authorization_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, perform a WC
ledger write, modify a WC balance, emit a ledger receipt, debit WC, settle WC to
VOID, move funds, access a wallet or unrestricted signer, administer a node,
resolve disputes, or activate Buy VOID fulfillment.

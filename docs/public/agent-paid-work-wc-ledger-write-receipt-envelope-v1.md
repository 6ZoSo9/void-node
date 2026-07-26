# VOID Agent Paid Work WC Ledger Write Receipt Envelope V1

Marker: `VOID_AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ENVELOPE_V1`

## Purpose

This lane defines a deterministic immutable receipt for one exact paid-work WC
award authorization applied as one atomic `earn` entry in a Work Credit ledger.

The receipt binds the complete paid-work lineage, WC-award authorization,
beneficiary identities, destination WC account, award amount and policy, ledger
write and entry identities, authorization consumption, uniqueness enforcement,
prestate and poststate commitments, ledger sequence transition, balance
transition, receipt evidence, and authenticated ledger executor.

This contract models the receipt emitted by a successful ledger write. The
example is synthetic. It does not perform a real WC ledger mutation, alter a
real WC balance, settle WC to VOID, move funds, access a wallet, administer
runtime state, or activate Buy VOID fulfillment.

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
11. One bounded WC award is authorized.
12. This envelope records one exact atomic WC ledger write.
13. A separate WC→VOID settlement process may later use eligible ledger state.

V1 covers step 12 only.

## Exact lineage and authorization binding

The receipt binds:

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
- `wc_award_authorization_id`

The ledger write must match the exact beneficiary, award amount, award reason,
award policy, score-basis commitment, ledger identifier, destination account,
uniqueness key, and expected prestate declared by the WC-award authorization.

A receipt for one authorization, verification, beneficiary, ledger, entry, or
state transition cannot be reused as proof of another.

## Applied-write semantics

V1 records successful applied writes only.

The ledger-write block requires:

- `entry_type=earn`
- `status=applied`
- `authorization_consumed=true`
- `atomic_write_confirmed=true`
- `uniqueness_key_enforced=true`
- `prestate_matched=true`
- `duplicate_detected=false`

Failed, rejected, stale-prestate, duplicate, expired, or partially applied
attempts require a separate failure-record contract and cannot be represented
as a successful receipt.

## Atomic authorization consumption

The exact WC-award authorization must be consumed once in the same atomic
operation that appends the ledger entry.

The operation must not:

- append an entry without consuming its authorization
- consume the authorization without recording the applied entry
- create multiple entries from one authorization
- create multiple awards from one independent verification
- accept a duplicate uniqueness key
- apply against a mismatched expected prestate

Authorization consumption precedes or coincides with the applied write and must
occur before the receipt is created.

## Beneficiary and award binding

The receipt binds:

- verified executor identity
- quoted provider identity
- destination `wc_account_id`
- denomination `WC`
- positive award amount
- award reason code
- award policy identifier
- score-basis commitment

The destination account must match the account authorized for the beneficiary.
The applied amount must equal the authorized amount and must remain within the
authorized maximum.

The receipt cannot redirect the award, change the amount, substitute another
policy, or convert the award into VOID.

## Uniqueness and replay protection

The uniqueness key is:

```text
paid-work-verification:<independent_completion_verification_id>
```

The downstream registry must guarantee that this uniqueness key, ledger-write
identity, ledger-entry identity, and consumed authorization cannot be replayed
or accepted twice.

`duplicate_detected=false` means the successful write was not a duplicate. It
does not waive duplicate checks for future submissions.

## Prestate and poststate commitments

The receipt records:

- expected prestate commitment from the authorization
- observed prestate commitment
- resulting poststate commitment
- ledger sequence before the write
- ledger sequence after the write
- account balance before the write
- account balance after the write

For an applied V1 earn entry:

- expected and observed prestate commitments must match
- `ledger_sequence_after` must equal `ledger_sequence_before + 1`
- earned WC must increase by exactly `amount_wc`
- debited WC must remain unchanged
- redeemable WC must increase by exactly `amount_wc`
- each balance must satisfy `redeemable_wc = earned_wc - debited_wc`
- all balances must remain non-negative safe integers

The receipt must reject inconsistent arithmetic even when every supplied hash
has a syntactically valid format.

## Receipt evidence

The receipt commits to:

- exact ledger entry
- append log
- authorization verification
- uniqueness registry
- resulting balance snapshot

These commitments make the ledger transition independently auditable without
embedding mutable ledger files, secrets, private keys, or unrestricted
credentials in the envelope.

The receipt and ledger entry are immutable after publication.

## Ledger executor authentication

The ledger-executor block binds:

- executor identity
- execution policy
- signing-key identity
- signature scheme
- signed-payload commitment
- signature-evidence commitment

The ledger executor must authenticate under the exact bound execution policy.
The envelope contains identifiers and cryptographic commitments, not private
keys, seed phrases, wallet credentials, or general ledger-administration
authority.

The ledger executor must remain distinct from the beneficiary WC account. It
records an already authorized award and does not choose the beneficiary or
award amount.

## Balance mutation boundary

This receipt is the proof artifact for a WC balance mutation, but the contract
lane itself does not mutate any live ledger.

The synthetic example models:

```text
pre:  earned=0, debited=0, redeemable=0
award: +3 WC earned
post: earned=3, debited=0, redeemable=3
```

No real account acquires WC merely because the example or schema exists.

## WC→VOID settlement boundary

The receipt requires `wc_to_void_settlement_separate=true`.

It proves only that an authorized WC earn entry was applied. It does not
authorize or prove:

- a WC debit
- a settlement request
- a WC→VOID conversion
- VOID minting or transfer
- wallet access
- transaction signing
- fund movement

A later settlement lane must independently bind the exact ledger receipt,
current redeemable balance, conversion policy, destination, replay controls,
settlement authorization, and resulting debit and VOID-transfer receipts.

## Payment, wallet, runtime, and Buy VOID boundary

The attestation requires:

- `payment_state_unchanged=true`
- `wallet_or_signer_not_accessed=true`
- `runtime_not_administered=true`
- `buy_void_fulfillment_unchanged=true`
- `receipt_is_not_wc_to_void_settlement=true`
- `receipt_is_not_payment_instruction=true`

The ledger receipt cannot be repurposed as payment execution, wallet authority,
runtime administration, Buy VOID fulfillment, or WC→VOID settlement.

## Deterministic identity

`wc_ledger_write_receipt_id` is:

```text
voidawwclwr1_ + sha256(canonical_json(draft_without_receipt_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding.

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, write to a
real WC ledger, modify a real WC balance, execute a WC debit, settle WC to VOID,
move funds, access a wallet or unrestricted signer, administer a node, resolve
ledger disputes, or activate Buy VOID fulfillment.

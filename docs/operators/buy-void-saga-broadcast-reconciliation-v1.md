# Buy VOID saga broadcast reconciliation v1

Markers:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CUSTODY_V1
VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1
VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_V1
VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_COORDINATOR_V1
```

## Problem

The prepared-transaction custody lane ends with a final signed transaction hash and an opaque external custody identity. The saga's next action is `execute_prepared_transaction`.

A safe handoff must survive all of these process terminations:

1. after the saga commits its write-ahead broadcast intent but before external submission;
2. after external submission but before local evidence persistence;
3. after local evidence persistence but before execution/outcome journal writes; and
4. after execution/outcome journal writes but before the saga appends the corresponding broadcast or receipt event.

Blind retry is forbidden after the write-ahead intent because the first submission may have reached the network.

## Stack relationship

This source-only lane is stacked on the exact prepared-transaction custody head:

```text
c242632b7013305ab192ea69413f78bff0a56649
```

The child is `12` commits ahead and `0` behind that parent without history
rewrite. The parent pull request remains a separate review and merge gate.

## Opaque broadcaster contract

The application provides only content-addressed metadata:

- saga ID;
- attempt ID;
- broadcast-intent ID;
- custody idempotency key;
- custody-handle fingerprint;
- transaction-plan fingerprint; and
- final signed transaction hash.

It never provides or receives the actual custody handle or signed payload bytes.

The external dependency exposes exactly:

```text
submit_once(...)
inspect_submission(...)
```

`submit_once` is allowed only during the saga's `execute_prepared_transaction` adapter, after the saga supervisor has durably appended `broadcast_intent_committed`.

`inspect_submission` is the only external operation allowed during `reconcile_possible_broadcast`. Reconciliation never calls `submit_once`.

Supported outcomes are:

- definitive `not_submitted`;
- `unknown` possible submission;
- network/provider `accepted`;
- definitively `confirmed`; and
- definitively `reverted`.

## Server policy

The coordinator accepts no caller-supplied economic or receipt policy.

It inherits the exact parent economic policy and reads two additional server settings:

```text
VOID_BUY_VOID_SAGA_BROADCAST_RECEIPT_RPC_URL
VOID_BUY_VOID_SAGA_BROADCAST_RECEIPT_MIN_CONFIRMATIONS
```

The receipt endpoint must be loopback HTTP. The stable policy fingerprint binds:

- the parent economic-policy fingerprint;
- chain ID 2050;
- receipt endpoint fingerprint;
- receipt confirmation floor; and
- fulfillment-wallet fingerprint.

Apply requires the exact stable fingerprint returned by dry run.

## Durable evidence ordering

Every external outcome is persisted in this order:

```text
external outcome
  -> private broadcast-evidence hash chain
  -> canonical execution-attempt and broadcast-outcome journals
  -> saga event
```

The private evidence journal stores only:

- saga, attempt, intent, and transaction identities;
- bounded provider submission ID and fingerprint;
- submission-status flags; and
- confirmed or reverted receipt evidence.

It does not store a custody handle, signed payload bytes, credentials, wallet material, or signer material.

The receipt record includes the block hash required by the saga event. This permits recovery when terminal execution/outcome journals were written but the process terminated before the saga append.

Terminal evidence is immutable. After `confirmed` or `reverted` is recorded,
only an exact semantic duplicate is accepted. A changed provider identity,
receipt status, block number, block hash, confirmation snapshot, address, or
amount holds without appending another event.

Duplicate comparison explicitly projects only saga, attempt, intent,
transaction, outcome, provider, submission-state, and receipt fields.
Append-only metadata such as sequence, event ID, previous-event link,
recording time, provider fingerprint, and authority metadata cannot alter
semantic idempotency.

## Definitive not-submitted recovery

A process may terminate after `broadcast_intent_committed` but before entering the external submitter.

On restart, reconciliation performs inspection only. A definitive `not_submitted` result is recorded in the evidence journal, then appended to the saga as `broadcast_not_attempted` under a fresh lease and fencing token. The saga may then require another explicitly confirmed execution attempt.

No submission occurs during that reconciliation call.

## Unknown and accepted recovery

An unknown result records:

- the execution broadcast observation;
- `broadcast_unknown` outcome evidence; and
- the saga `broadcast_unknown` event when the initial execute tick completes.

A continuing unknown result during reconciliation produces a hold with no new saga event and no resubmission.

An accepted result records the canonical execution broadcast and accepted outcome before the saga advances to `broadcast_accepted`.

## Confirmed and reverted recovery

A terminal receipt is first written to the private evidence chain. The coordinator then uses the existing pipeline journals to record:

- accepted external broadcast;
- confirmed fulfillment and confirmed state, or definitive revert and post-broadcast failure; and
- canonical broadcast outcome.

Only after those records are readable does the saga append `receipt_confirmed` or `receipt_reverted`.

A terminal evidence record can complete the saga after restart without another external inspection and without another submission.

## Focused proof

The real-filesystem proof builds the parent stack through `transaction_prepared`, then proves:

- intent-before-submit termination performs zero submission calls;
- definitive not-submitted inspection restores `broadcast_not_attempted`;
- a later explicit execution performs exactly one submission;
- submit-before-evidence termination is recovered by inspection only;
- evidence-before-projection termination is recovered without resubmission;
- projection-before-saga termination is recovered entirely from durable evidence and canonical journals;
- an exact duplicate terminal receipt is idempotent;
- a conflicting terminal receipt is rejected without changing the evidence head;
- read-only inspection reports zero current-call submission, broadcast, and money movement;
- a persistent unknown state remains held;
- unknown can advance to accepted after inspection;
- confirmed recovery reaches `receipt_confirmed`;
- reverted recovery reaches terminal `receipt_reverted`; and
- all reconciliation submit-call counts remain zero.

Expected marker:

```text
VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_V1_PROOF_GREEN
```

## Authority boundary

This lane is source, proof, documentation, and CI only.

It does not mount a runtime route, run a background loop, call a live RPC, access credentials or private material, access a wallet, perform real signing, retrieve signed payload bytes, invoke a real broadcaster, decrement inventory, close a public request, deploy, restart services, write or settle Work Credits, mutate validators, or move funds.

Runtime composition, real custody access, real transaction submission, receipt monitoring, public fulfillment closeout, deployment, service mutation, and money movement remain separate explicit gates.

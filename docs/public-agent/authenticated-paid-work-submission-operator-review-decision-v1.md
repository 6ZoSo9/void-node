# Authenticated Paid Work Submission Operator Review Decision V1

Marker:

`VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1`

## Purpose

This contract records exactly one append-once operator review decision for one
authenticated paid-work submission review queue item.

An approval grants **provider selection eligibility** only. It does not select
a provider and does not create a quote.

A rejection ends this review path unless a future, separately reviewed contract
explicitly permits reopening it.

## Input requirements

The queue item must prove:

- status `received_pending_operator_review`;
- credential-registry authentication;
- authorization verification;
- admission decision `accepted_for_review`;
- an empty admission reason-code list;
- an exact receipt-index binding;
- `operator_review_required=true`; and
- every downstream authority field remains false.

## Persistence

The `decide` command writes:

- `decisions/<review_decision_id>.json`;
- `queue-item-indexes/<queue_item_id>.json`; and
- a temporary private lock under `locks/`.

The decision ID is stable for the queue-item and receipt bindings. There is one decision per queue item.

A repeat with the same reviewer, outcome, and reason codes returns
`duplicate=true`. A conflicting decision is rejected. If a crash writes the
decision but not the index, the next semantically identical call validates and
recovers the orphaned decision.

## Approval boundary

`approved_for_provider_selection` produces:

- `provider_selection_eligible=true`;
- status `approved_pending_provider_selection`; and
- next action `provider_selection_may_be_attempted_but_not_performed`.

It does not select a provider. It does not create a quote.

It grants no requester acceptance, no payment, no work execution, no dispatch,
no Work Credit award or ledger write, no VOID settlement, no wallet or signer
access, no signing, no transaction broadcast, and no Buy VOID fulfillment.

## Rejection boundary

`rejected_by_operator` produces:

- `provider_selection_eligible=false`;
- status `rejected_terminal`; and
- no further action under this contract.

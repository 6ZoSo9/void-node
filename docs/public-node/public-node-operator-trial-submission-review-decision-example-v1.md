# Public Node Operator Trial Submission Review Decision Example v1

Status: trial submission review decision example ready.

Marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1`

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_DECISION_EXAMPLE_V1_GREEN`

## Purpose

Public-safe example operator decision for a definition-only public node operator trial submission review queue item.

## Example decision

- decision status: `example_not_applied`
- queue status before: `received_pending_operator_review`
- queue status after: `informational_only`
- accepted as public-safe evidence: `false`
- work credit awarded: `false`
- work credit amount: `0`
- WC ledger write authorized: `false`
- wallet send authorized: `false`
- money movement authorized: `false`
- Buy VOID fulfillment authorized: `false`
- validator admission authorized: `false`
- queue mutation authorized: `false`
- network truth claim: `false`

## Boundary

Read-only public routes only. This does not enable live operator authority, public queue mutation, public upload endpoints, wallet sends, money movement, Buy VOID fulfillment, WC issuance, WC ledger writes, WC to VOID swap, validator admission, validator mutation, runtime truth claims, or tester receipts as network truth.

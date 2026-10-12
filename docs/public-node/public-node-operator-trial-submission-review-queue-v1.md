# Public Node Operator Trial Submission Review Queue v1

Status: trial submission review queue ready.

Marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1`

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_REVIEW_QUEUE_V1_GREEN`

## Purpose

Public-safe definition-only review queue for operator review of submitted public node operator trial receipts.

## Queue policy

- Definition-only queue.
- Manual operator review is required.
- Public queue mutation is disabled.
- Public upload route is disabled.
- Public form route is disabled.
- Queue item creation is not enabled by this artifact.
- Queue status does not authorize WC, ledger writes, wallet sends, money movement, Buy VOID fulfillment, or validator admission.

## Queue fields

- `queue_item_id`
- `submission_timestamp_utc`
- `tester_alias_or_handle`
- `submitted_receipt_route_or_attachment_reference`
- `submission_intake_version`
- `operator_review_status`
- `assigned_operator_alias`
- `review_checklist_route`
- `decision_template_route`
- `operator_decision_record_route`
- `public_safe_notes`

## Boundary

Read-only public routes only. This does not enable live operator authority, public upload endpoints, public queue mutation, wallet sends, money movement, Buy VOID fulfillment, WC issuance, WC ledger writes, WC to VOID swap, validator admission, validator mutation, runtime truth claims, or tester receipts as network truth.

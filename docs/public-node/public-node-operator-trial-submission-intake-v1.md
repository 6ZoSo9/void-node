# Public Node Operator Trial Submission Intake v1

Status: trial submission intake ready.

Marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1`

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_SUBMISSION_INTAKE_V1_GREEN`

## Purpose

Public-safe manual intake guide for outside testers or operators submitting a real public node operator trial receipt for operator review.

## Submission policy

- Manual operator review is required.
- Operator-provided submission channel is required.
- Public upload route is disabled.
- Public form route is disabled.
- Submitted receipts are not network truth.
- Submission does not authorize WC, ledger writes, wallet sends, money movement, Buy VOID fulfillment, or validator admission.

## Required submission fields

- `tester_alias_or_handle`
- `operator_trial_packet_route_used`
- `connect_pack_route_used`
- `receipt_template_version`
- `timestamp_utc`
- `machine_or_environment_summary`
- `public_routes_opened`
- `observed_result`
- `logs_or_screenshots_if_public_safe`
- `boundary_acknowledgement`
- `requested_operator_review_outcome`

## Boundary

Read-only public routes only. This does not enable live operator authority, wallet sends, money movement, Buy VOID fulfillment, WC issuance, WC ledger writes, WC to VOID swap, validator admission, validator mutation, runtime truth claims, or tester receipts as network truth.

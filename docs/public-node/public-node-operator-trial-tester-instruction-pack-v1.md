# Public Node Operator Trial Tester Instruction Pack v1

Status: trial tester instruction pack ready.

Marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1`

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_TESTER_INSTRUCTION_PACK_V1_GREEN`

## Purpose

Human-facing public-safe instruction pack for an outside tester/operator to follow the sealed public node operator trial lane and prepare a manual-review receipt.

## Tester steps

- Start at the public entrypoint: Open the public node operator trial public entrypoint and confirm the terminal final seal is present.
- Read the trial packet: Open the trial packet and understand the read-only boundary before doing anything.
- Open the connect pack: Use only the public-safe connect pack route. Do not assume this enables a live public mutation or upload flow.
- Fill a receipt locally: Use the receipt template to prepare a public-safe receipt. Keep private keys, secrets, wallet seed phrases, private IPs, private logs, and sensitive account details out of the receipt.
- Compare against examples: Compare your receipt against the trial receipt example and the review decision example so your evidence is structured correctly.
- Submit through an operator-provided channel only: Submit the receipt only through a channel explicitly provided by the operator. This repository does not provide a public upload route or public queue mutation route.
- Wait for manual operator review: Your submission enters manual operator review. Queue presence, receipt submission, or a status artifact does not create network truth or authorize any reward.

## Required receipt fields

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

## Do not include

- private keys
- seed phrases
- wallet secrets
- private API tokens
- private IP addresses unless explicitly approved
- sensitive logs
- personal identity documents
- payment secrets
- anything that should not be public

## Boundary

Read-only public routes only. This does not enable live operator authority, public queue mutation, public upload endpoints, public forms, wallet sends, money movement, Buy VOID fulfillment, WC issuance, WC ledger writes, WC to VOID swap, validator admission, validator mutation, runtime truth claims, or tester receipts as network truth.

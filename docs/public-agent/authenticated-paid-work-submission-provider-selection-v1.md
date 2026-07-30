# Authenticated Paid Work Submission Provider Selection V1

Marker:

`VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_PROVIDER_SELECTION_V1`

Registry marker:

`VOID_AUTHENTICATED_PAID_WORK_PROVIDER_REGISTRY_SNAPSHOT_V1`

## Purpose

This contract performs deterministic provider selection after an authenticated
paid-work queue item has received an append-once operator decision with:

- outcome `approved_for_provider_selection`;
- `provider_selection_eligible=true`;
- status `approved_pending_provider_selection`; and
- no downstream authority enabled.

This contract selects one provider. It does not create a quote.

## Provider registry snapshot

The registry snapshot is immutable and content-addressed. Each provider entry
binds a stable provider ID, active status, verified provider-authentication
packet SHA-256, supported capabilities and quote assets, request limits,
available capacity, and deterministic priority.

Provider and capability arrays are normalized before the registry snapshot ID
is derived, so input ordering does not affect identity.

## Eligibility and ranking

A provider is eligible only when it is active, authenticated, supports the
requested capability and quote asset, covers the requested maximum total, and
has at least one available capacity unit.

An empty eligible set is rejected.

Eligible providers are ranked by:

1. priority ascending;
2. provider ID ascending.

The selected record includes a SHA-256 commitment to the full eligible
candidate set.

## Persistence

The `select` command writes:

- `selections/<provider_selection_id>.json`;
- `review-decision-indexes/<review_decision_id>.json`; and
- a temporary private lock under `locks/`.

There is one selection per review decision.

An exact repeat using the same registry snapshot returns `duplicate=true`.
A crash after selection persistence but before index persistence is recovered
after full validation. A conflicting registry snapshot is rejected after a
selection exists.

## Authority boundary

The selection record sets `provider_selected=true` and
`provider_selection_executed=true`, with status
`provider_selected_pending_quote`.

It does not create a quote.

It grants no requester acceptance, no payment, no work execution, no dispatch,
no Work Credit award or ledger write, no VOID settlement, no wallet or signer
access, no signing, no transaction broadcast, and no Buy VOID fulfillment.

The next action is:

`provider_quote_may_be_requested_but_not_created`

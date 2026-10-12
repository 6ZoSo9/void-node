# Agent Paid-Work Credential Request Review Queue V1

This lane turns accepted credential-review requests into a private, deterministic operator queue.

It does not issue or activate credentials.

## Boundaries

A gateway receipt with `accepted_for_review` means only that the request is eligible for review.

The review CLI can write one append-only decision per request:

- `approve_for_issuance_preparation`
- `reject`

Approval authorizes only creation of a bounded issuance-preparation artifact. It does not authorize credential issuance, registry mutation, service restart, token access, payment, work execution, Work Credit writes, wallet access, or Buy VOID fulfillment.

## Queue

```bash
npx tsx scripts/agent_paid_work_credential_request_review_queue_v1.ts queue \
  --state-directory "$HOME/.local/state/void-agent-paid-work-credential-request-gateway-v1" \
  --decision-directory "$HOME/.local/state/void-agent-paid-work-credential-request-review-v1/decisions" \
  --policy fixtures/agent-paid-work/credential-request-review-policy-v1.example.json \
  --now-utc 2026-07-27T22:00:00Z
```

The queue exposes the HTTPS callback host, but never the complete callback URI.

## Decide

Approval:

```bash
npx tsx scripts/agent_paid_work_credential_request_review_queue_v1.ts decide \
  --state-directory "$HOME/.local/state/void-agent-paid-work-credential-request-gateway-v1" \
  --decision-directory "$HOME/.local/state/void-agent-paid-work-credential-request-review-v1/decisions" \
  --policy fixtures/agent-paid-work/credential-request-review-policy-v1.example.json \
  --request-id "voidapwcrq1_..." \
  --reviewer-id "void.operator.zoso" \
  --decision approve_for_issuance_preparation \
  --reason-code requirements_verified \
  --decided-at-utc 2026-07-27T22:00:00Z \
  --confirm credentialRequestReview
```

A repeated byte-identical decision is idempotent. A conflicting decision is rejected.

## Prepare bounded issuance

```bash
npx tsx scripts/agent_paid_work_credential_request_bounded_issuance_v1.ts \
  --request "$HOME/.local/state/void-agent-paid-work-credential-request-gateway-v1/requests/voidapwcrq1_....json" \
  --receipt "$HOME/.local/state/void-agent-paid-work-credential-request-gateway-v1/receipts/voidapwcrq1_....json" \
  --decision "$HOME/.local/state/void-agent-paid-work-credential-request-review-v1/decisions/voidapwcrq1_....json" \
  --policy fixtures/agent-paid-work/credential-request-review-policy-v1.example.json \
  --output "$HOME/.local/state/void-agent-paid-work-credential-request-review-v1/preparations/voidapwcrq1_....json" \
  --prepared-at-utc 2026-07-27T22:05:00Z \
  --confirm prepareCredentialIssuance
```

The preparation artifact:

- caps credential lifetime against policy;
- preserves only policy-approved capabilities;
- hashes the callback URI instead of including it;
- references the existing credential lifecycle CLI;
- performs no lifecycle CLI application;
- contains no raw token.

# Authenticated Paid Work Submission Review Queue Handoff V1

Marker: `VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1`

Queue-item marker: `VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1`

## Purpose

This contract turns one persisted, credential-authenticated paid-work intake
receipt with admission decision `accepted_for_review` into one private,
append-once review queue item with status
`received_pending_operator_review`.

It sits between submission admission and all downstream provider, quote,
acceptance, payment, execution, and settlement contracts.

## Accepted input

The adapter accepts only a receiver receipt proving credential-registry
authentication, the `agent_paid_work_submit` scope,
`authorization_verified=true`, a non-duplicate receipt, an empty admission
reason list, and `accepted_for_review`.

Every receipt and admission authority field must remain false. Rejected intake,
fallback-token authentication, a binding mismatch, a duplicate response, or any
enabled authority is rejected.

## Queue persistence

The explicit `enqueue` mode writes to a private operator-selected directory:

- `items/<queue_item_id>.json`
- `receipt-indexes/<receipt_id>.json`

The receipt index enforces one queue item per accepted receipt. Repeating the
same receipt returns `duplicate=true` without a second queue item.

A private receipt-specific lock prevents concurrent enqueue attempts. A fully
validated orphan item can be recovered by writing only the missing receipt
index.

## Commands

Materialize without queue mutation:

```bash
npx tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts \
  materialize /private/accepted-receipt.json 2026-07-30T15:49:00Z \
  /private/review-item.json
```

Verify:

```bash
npx tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts \
  verify /private/accepted-receipt.json /private/review-item.json
```

Explicitly enqueue:

```bash
npx tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts \
  enqueue /private/accepted-receipt.json 2026-07-30T15:49:00Z \
  /private/authenticated-paid-work-review-queue-v1 \
  /private/enqueue-response.json
```

## Authority boundary

Enqueue grants no provider selection and no quote creation.

It grants no payment authorization, no payment execution, no work execution,
no dispatch, no Work Credit award, no WC ledger write, no VOID settlement, no
wallet or signer access, no signing, no transaction broadcast, and no Buy VOID
fulfillment.

A separate operator review decision is required before provider selection or
quote creation. Requester quote acceptance and acceptance persistence remain
later, separate contracts.

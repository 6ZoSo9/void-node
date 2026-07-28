# External Agent Paid-Work Fulfillment Transition Executor V1

## Purpose

V1 prepares the first bounded transition in the reusable fulfillment state machine:

`accepted_submission_bound → ticket_issue_planned`

It validates the source fulfillment plan, coordinator role and ticket capacity, destination WC balance, content-addressed runtime hashes, and ticket-issue policy. It then writes a sanitized transition intent, orchestrator event, precondition receipt, and package manifest.

## Non-Mutating Boundary

V1 does not:

- Advance the canonical fulfillment plan.
- Issue or transfer a ticket.
- Dispatch or execute work.
- Read or output a raw capability token.
- Write Work Credits.
- Transfer payments or settle WC to VOID.
- Restart services or deploy runtime changes.

The generated event is compatible with the reusable orchestrator, but a separate future execution lane must explicitly apply it.

## Inputs

- Fulfillment orchestrator plan in `accepted_submission_bound`.
- Coordinator status snapshot.
- Destination WC balance snapshot.
- Content-addressed runtime snapshot.
- Ticket-issue policy snapshot.
- Preparation timestamp and nonce.

## Preconditions

- Plan next transition is `ticket_issue_planned`.
- Coordinator identity and role match the plan.
- Destination account has zero active tickets and available per-account capacity.
- Global ticket capacity remains.
- Fixed award and ticket TTL match the pinned plan.
- Participant, pilot, acceptance, and adapter hashes match exactly.
- No raw capability token appears in any input or output.

## Commands

### Prepare

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_transition_executor_v1.ts \
  prepare \
  --plan /private/fulfillment-plan-v1.json \
  --coordinator-snapshot /private/coordinator-status-snapshot-v1.json \
  --wc-balance-snapshot /private/wc-balance-snapshot-v1.json \
  --runtime-snapshot /private/runtime-snapshot-v1.json \
  --ticket-policy-snapshot /private/ticket-policy-snapshot-v1.json \
  --prepared-at-utc 2026-07-28T22:02:00Z \
  --nonce operator-approved-transition-v1 \
  --output-dir /private/transition-package-v1 \
  --confirm prepare-external-agent-paid-work-fulfillment-transition-executor-v1
```

The output directory is mode `0700`; all four files are mode `0600`.

Repeated preparation with identical inputs and output directory is idempotent. Any mismatched existing file causes a hold.

### Inspect

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_transition_executor_v1.ts \
  inspect \
  --output-dir /private/transition-package-v1
```

## Outputs

- `transition-intent-v1.json`
- `orchestrator-event-v1.json`
- `precondition-receipt-v1.json`
- `transition-package-v1.json`

## Next Build Step

A later bounded ticket-issue executor may consume this package and invoke the existing ticket issuer under a separate explicit confirmation. That later lane must preserve single-use tickets, content-addressed runtime, fixed award, cap checks, token secrecy, and resumable state.

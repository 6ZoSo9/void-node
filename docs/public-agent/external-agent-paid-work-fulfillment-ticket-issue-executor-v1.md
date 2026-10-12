# External Agent Paid-Work Fulfillment Ticket-Issue Executor V1

## Purpose

V1 performs the first irreversible step in reusable external-agent paid-work fulfillment: issuing exactly one single-use WC pilot ticket after a validated transition package and explicit operator confirmation.

It advances only a **private fulfillment-plan copy** from `accepted_submission_bound` to `ticket_issue_planned`, issues one ticket through a private transport profile, writes the raw response and operator ticket as mode-`0600` files, creates a sanitized receipt, and generates the next `ticket_package_planned` orchestrator event.

## Authority Boundary

V1 may read the source plan and transition package, write private operation state, advance the private plan copy, issue one single-use ticket, privately persist the returned capability token, and create a sanitized receipt and next event.

V1 may not transfer the ticket, dispatch or execute work, write WC, move payments, settle WC to VOID, access wallet signers, restart services, or deploy runtime changes.

## Exactly-Once Safety

The operation directory is created before the network mutation. Its normal phases are:

1. `prepared`
2. `issuing`
3. `issued_raw_persisted`
4. `complete`

If the process fails after the issue attempt begins but before the raw response is persisted, the operation moves to `ambiguous_after_issue_attempt`. Automatic reissue is forbidden. The operator must recover the exact response or inspect coordinator-issued state.

A completed operation is idempotent: rerunning `execute` returns the existing result without another transport call.

## Private Files

The operation directory is mode `0700`. Every file is mode `0600`.

- `operation-state-v1.json`
- `advanced-plan-ticket-issue-planned-v1.json`
- `transport-profile-v1.json`
- `issue-request-v1.json`
- `raw-ticket-issue-response-v1.json`
- `operator-ticket-v1.json`
- `sanitized-ticket-issue-receipt-v1.json`
- `ticket-package-planned-event-v1.json`

Raw capability tokens appear only in the private raw response and operator ticket. CLI output, operation state, sanitized receipt, and orchestrator event contain no raw token.

## Transport Profile

The private transport profile defines the issue URL, confirmation query parameter and value, expected success status, and JSON Pointer bindings for request and response semantic fields. This pins the executor to the exact live operator surface without coupling the state machine to one JSON layout.

## Execute

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts \
  execute \
  --source-plan /private/source-plan-v1.json \
  --transition-package-dir /private/transition-package-v1 \
  --transport-profile /private/transport-profile-v1.json \
  --issue-request /private/issue-request-v1.json \
  --executed-at-utc 2026-07-28T22:34:00Z \
  --output-dir /private/ticket-issue-operation-v1 \
  --confirm execute-external-agent-paid-work-fulfillment-ticket-issue-executor-v1
```

## Recover

Recovery is allowed only after confirming that an issue attempt occurred and obtaining the exact raw response for the same operation.

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts \
  recover \
  --source-plan /private/source-plan-v1.json \
  --transition-package-dir /private/transition-package-v1 \
  --transport-profile /private/transport-profile-v1.json \
  --issue-request /private/issue-request-v1.json \
  --recovered-raw-response /private/recovered-raw-response-v1.json \
  --recovered-at-utc 2026-07-28T22:42:00Z \
  --output-dir /private/ticket-issue-operation-v1 \
  --confirm recover-external-agent-paid-work-fulfillment-ticket-issue-executor-v1
```

## Inspect

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_issue_executor_v1.ts \
  inspect \
  --output-dir /private/ticket-issue-operation-v1
```

## Next Lane

A later ticket-package and transfer executor may consume the private operator ticket and generated `ticket_package_planned` event. That lane must preserve token secrecy, verified destination and executor identity, one-time transfer, receipt return, and no WC write before verified execution.

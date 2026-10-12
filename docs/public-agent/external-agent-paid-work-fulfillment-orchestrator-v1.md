# External Agent Paid-Work Fulfillment Orchestrator V1

## Purpose

This lane converts the proven one-off external-agent paid-work → WC path into a reusable, deterministic fulfillment state machine.

V1 does **not** issue tickets, transfer capability-bearing packages, dispatch work, execute work, write WC, move funds, settle WC to VOID, restart services, or deploy runtime changes. It creates and validates private fulfillment plans and records sanitized transition evidence.

## State Machine

1. `accepted_submission_bound`
2. `ticket_issue_planned`
3. `ticket_package_planned`
4. `executor_receipt_expected`
5. `adapter_finalization_planned`
6. `completed`

Any non-completed state may transition to `held`. A held plan can resume only to the exact state from which it was held.

## Invariants

- Deterministic `fulfillment_id` from the accepted submission, binding, execution contract, source-artifact digests, and nonce.
- Immutable event IDs and revisioned plan IDs.
- Duplicate events are idempotent and cannot create another revision.
- WC award is fixed by the pinned execution contract.
- Raw capability tokens are rejected from requests, plans, and events.
- Every mutating network/runtime authority is fixed to `false`.
- Every transition requires `advance-external-agent-paid-work-fulfillment-orchestrator-v1`.
- CLI-written private plans use mode `0600`.
- Partial fulfillment can be held and resumed from the exact prior state.

## Commands

### Stage

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_orchestrator_v1.ts \
  stage \
  --request /private/request-v1.json \
  --output /private/plan-revision-0.json
```

### Inspect

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_orchestrator_v1.ts \
  inspect \
  --plan /private/plan-revision-0.json
```

### Advance

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_orchestrator_v1.ts \
  advance \
  --plan /private/plan-revision-0.json \
  --event /private/event-v1.json \
  --output /private/plan-revision-1.json \
  --confirm advance-external-agent-paid-work-fulfillment-orchestrator-v1
```

Advance records sanitized evidence only. It never performs the represented operation.

## Future Integration

A later bounded transition executor may invoke the existing ticket issuer, participant runner, and WC adapter between state transitions. It must preserve content-addressed runtime hashes, single-use tickets, the fixed award, duplicate-finalization protection, and resume-existing-state behavior.

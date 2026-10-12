# External Agent Paid-Work Fulfillment Executor Receive-and-Run V1

## Purpose

V1 performs the Nimo-side participant execution step for a transferred private executor ticket package. It verifies the transfer receipt, executor identity, ticket, participant CLI hash, and private plan state; persists operation state before execution; invokes the participant CLI at most once; validates the participant receipt; removes token-bearing artifacts; and creates a sanitized return package for Precision.

## Authority Boundary

V1 may:

- Read the received private executor package.
- Materialize the pinned participant CLI and operator ticket privately.
- Advance a private plan copy to `executor_receipt_expected`.
- Execute the participant CLI once under explicit confirmation.
- Consume the single-use ticket through the participant CLI.
- Write the participant receipt, sanitized executor receipt, return package, and next orchestrator event.

V1 may not:

- Accept the participant receipt on Precision.
- Directly write a local WC ledger.
- Transfer payments or settle WC to VOID.
- Access wallet signers.
- Restart services or deploy runtime changes.

Build and CI proofs use an injected mock participant transport. They do not consume a live ticket or execute live work.

## Exactly-Once Safety

The private operation directory and state are created before participant execution. Phases are:

1. `prepared`
2. `running`
3. `participant_receipt_persisted`
4. `complete`

If execution starts but no result is persisted, the operation moves to `ambiguous_after_run_attempt`. Automatic rerun is forbidden. Recovery requires the exact raw participant result for the same deterministic operation ID.

Completed operations are idempotent and return the existing result without another participant invocation.

## Inputs

- `private-executor-ticket-package-v1.json`
- `sanitized-ticket-package-transfer-receipt-v1.json`
- `advanced-plan-ticket-package-planned-v1.json`
- `executor-receipt-expected-event-v1.json`
- Executor receive/run profile
- Participant run profile

The participant run profile pins the command arguments and JSON Pointer bindings for the participant receipt.

## Execute

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts \
  execute \
  --received-package /private/inbox/private-executor-ticket-package-v1.json \
  --transfer-receipt /private/inbox/sanitized-ticket-package-transfer-receipt-v1.json \
  --package-plan /private/inbox/advanced-plan-ticket-package-planned-v1.json \
  --executor-receipt-event /private/inbox/executor-receipt-expected-event-v1.json \
  --executor-profile /private/config/executor-receive-run-profile-v1.json \
  --participant-run-profile /private/config/participant-run-profile-v1.json \
  --started-at-utc 2026-07-28T23:30:00Z \
  --output-dir /private/state/executor-run-operation-v1 \
  --confirm execute-external-agent-paid-work-fulfillment-executor-receive-and-run-v1
```

## Recover

Use recovery only when a participant execution attempt occurred and the exact raw result was recovered.

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts \
  recover \
  --received-package /private/inbox/private-executor-ticket-package-v1.json \
  --transfer-receipt /private/inbox/sanitized-ticket-package-transfer-receipt-v1.json \
  --package-plan /private/inbox/advanced-plan-ticket-package-planned-v1.json \
  --executor-receipt-event /private/inbox/executor-receipt-expected-event-v1.json \
  --executor-profile /private/config/executor-receive-run-profile-v1.json \
  --participant-run-profile /private/config/participant-run-profile-v1.json \
  --recovered-raw-result /private/recovery/raw-participant-run-result-v1.json \
  --recovered-at-utc 2026-07-28T23:35:00Z \
  --output-dir /private/state/executor-run-operation-v1 \
  --confirm recover-external-agent-paid-work-fulfillment-executor-receive-and-run-v1
```

## Private Outputs

The operation directory is mode `0700`. JSON files are mode `0600`; the participant CLI is mode `0700`.

- `executor-run-operation-state-v1.json`
- `advanced-plan-executor-receipt-expected-v1.json`
- `executor-receive-run-profile-v1.json`
- `participant-run-profile-v1.json`
- `participant-cli-v1`
- `raw-participant-run-result-v1.json`
- `participant-receipt-v1.json`
- `sanitized-executor-run-receipt-v1.json`
- `adapter-finalization-planned-event-v1.json`
- `participant-receipt-return-package-v1.json`

After successful execution, the received token-bearing package and extracted operator ticket are deleted. Sanitized outputs contain only the capability-token SHA-256.

## Next Lane

A Precision-side return-package acceptance and adapter finalization lane may consume the return package, verify the participant receipt, apply the canonical adapter exactly once, and advance the fulfillment plan to `completed` without a second WC credit.

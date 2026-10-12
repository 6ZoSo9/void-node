# External Agent Paid-Work Fulfillment Ticket-Package Transfer Executor V1

## Purpose

V1 performs the next bounded step in reusable external-agent paid-work fulfillment: it packages a completed private ticket-issue operation and transfers that package exactly once to the verified executor.

The executor consumes a complete ticket-issue operation, advances a private plan copy to `ticket_package_planned`, verifies the operator ticket and sanitized issue receipt, verifies the destination identity and pinned participant CLI hash, creates one private executor package, transfers it under explicit confirmation, writes a sanitized transfer receipt, and creates the `executor_receipt_expected` orchestrator event.

## Authority Boundary

V1 may:

- Read a complete private ticket-issue operation.
- Write a private package and transfer operation state.
- Transfer the private package once to the verified executor.
- Write a sanitized transfer receipt and next orchestrator event.

V1 may not:

- Execute the remote work.
- Accept a participant/executor receipt.
- Write Work Credits.
- Move payments or settle WC to VOID.
- Access wallet signers.
- Restart services or deploy runtime changes.

## Package Contents

The private package is a single mode-`0600` JSON file containing:

- The private operator ticket, including its raw capability token.
- The exact participant CLI bytes encoded as base64.
- The pinned participant CLI SHA-256.
- The destination executor identity.
- The fulfillment and ticket-issue operation identifiers.

The raw token is permitted only in this private package and the source operator ticket. It is forbidden from CLI output, operation state, the sanitized transfer receipt, and the orchestrator event.

## Exactly-Once Safety

The output directory is created before transport and is mode `0700`. Every file is mode `0600`.

Phases:

1. `prepared`
2. `transferring`
3. `transferred_ack_persisted`
4. `complete`

If transport starts but no acknowledgment is safely persisted, the operation moves to `ambiguous_after_transfer_attempt`. Automatic retransmission is forbidden. Recovery requires an exact acknowledgment bound to the same operation ID, package SHA-256, destination, and transport profile.

Completed operations are idempotent: repeating `execute` returns the existing result without another transport call.

## Destination Identity

The destination profile binds:

- Tailscale IP.
- VOID executor node ID.
- Transport destination argument.
- A content-addressed identity receipt.

The identity receipt must be mode-safe, hash-matched, explicitly verified, and consistent with the executor node ID pinned in the fulfillment plan.

## Transport Profile

The transfer profile contains a shell-free argv array. Exactly two placeholders are supported:

- `{package_path}`
- `{destination}`

For the current Tailscale path, a private profile may use:

```json
{
  "command_argv": [
    "sudo",
    "tailscale",
    "file",
    "cp",
    "{package_path}",
    "{destination}"
  ]
}
```

The executor invokes the command directly without a shell.

## Execute

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts \
  execute \
  --ticket-issue-operation-dir /private/ticket-issue-operation-v1 \
  --participant-cli /private/run-wc-public-earning-participant-cli-v1.sh \
  --destination-profile /private/nimo-destination-profile-v1.json \
  --transfer-profile /private/tailscale-file-transfer-profile-v1.json \
  --transferred-at-utc 2026-07-28T23:00:00Z \
  --output-dir /private/ticket-package-transfer-operation-v1 \
  --confirm execute-external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1
```

## Recover

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts \
  recover \
  --ticket-issue-operation-dir /private/ticket-issue-operation-v1 \
  --participant-cli /private/run-wc-public-earning-participant-cli-v1.sh \
  --destination-profile /private/nimo-destination-profile-v1.json \
  --transfer-profile /private/tailscale-file-transfer-profile-v1.json \
  --recovered-ack /private/recovered-transfer-ack-v1.json \
  --recovered-at-utc 2026-07-28T23:05:00Z \
  --output-dir /private/ticket-package-transfer-operation-v1 \
  --confirm recover-external-agent-paid-work-fulfillment-ticket-package-transfer-executor-v1
```

## Inspect

```bash
npx --yes tsx \
  scripts/external_agent_paid_work_fulfillment_ticket_package_transfer_executor_v1.ts \
  inspect \
  --output-dir /private/ticket-package-transfer-operation-v1
```

## Next Lane

A later executor-side receive-and-run lane may receive the package, validate its hashes and destination, reconstruct the private ticket and participant CLI, execute the work exactly once, delete the ticket/token package, and return a verified participant receipt. That lane remains separate from transfer so transfer cannot silently authorize work execution.

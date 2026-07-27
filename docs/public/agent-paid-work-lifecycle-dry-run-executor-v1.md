# VOID Agent Paid Work Lifecycle Dry-Run Executor V1

Marker: `VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_EXECUTOR_V1`

## Purpose

This lane introduces an isolated executor for proving the complete thirteen-phase
paid-work lifecycle without granting economic authority. It adds a deterministic
credential-to-WC-account binding contract and a crash-safe, append-once dry-run
state machine.

The lane closes the structural gap identified after live paid-work discovery was
activated: active paid-work credentials are not yet bound to destination Work
Credit accounts, and the paid-work lifecycle has no bounded WC→VOID settlement
executor.

## Commands

Inspect validates the binding and plan without writing state:

```bash
node scripts/agent_paid_work_lifecycle_dry_run_executor_v1.mjs inspect \
  --binding examples/agent-paid-work-credential-wc-account-binding-v1.example.json \
  --plan examples/agent-paid-work-lifecycle-dry-run-plan-v1.example.json
```

Dry-run requires an explicit confirmation and an isolated state directory:

```bash
node scripts/agent_paid_work_lifecycle_dry_run_executor_v1.mjs dry-run \
  --binding examples/agent-paid-work-credential-wc-account-binding-v1.example.json \
  --plan examples/agent-paid-work-lifecycle-dry-run-plan-v1.example.json \
  --state-dir /tmp/void-paid-work-lifecycle-dry-run-v1 \
  --confirm dryRunAgentPaidWorkLifecycleV1
```

## Safety boundary

- No payment transfer.
- No WC ledger write.
- No WC→VOID execution.
- No wallet or signer access.
- No network request.
- No service restart or deployment.
- No live credential token is required or emitted.
- No live credential-to-account binding is installed.

The executor accepts only `inspect` and `dry-run`. Any live command or live
authority flag is rejected.

## State and duplicate policy

The executor creates one append-once uniqueness record and one append-once
receipt under an explicitly isolated dry-run state directory. Identical retries
return the existing receipt. A conflicting request using the same uniqueness key
is rejected. The key-first write order permits crash-safe resume if execution is
interrupted between key creation and receipt creation.

## Lifecycle

The plan must bind these exact phases in order:

1. work order
2. quote
3. acceptance
4. payment intent
5. payment execution authorization
6. payment receipt
7. independent payment confirmation
8. work execution authorization
9. work completion receipt
10. independent completion verification
11. WC award authorization
12. WC ledger write
13. WC→VOID settlement

V1 proves the state machine and authority boundary only. A later separately
authorized lane must bind a real credential to a real WC account and prove live
payment, WC award, and settlement under explicit operator controls.

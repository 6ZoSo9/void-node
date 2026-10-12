# Agent Paid-Work WC Earning Adapter V1

## Purpose

This lane connects a credential-authenticated, `accepted_for_review` paid-work
submission to the already merged WC Public Earning Pilot V1.

It does **not** introduce a generic credit route. It stages a content-addressed
execution plan that binds:

- the paid-work submission receipt and work order,
- the authenticated paid-work credential,
- the active credential-to-WC-account binding,
- the exact one-use participant ticket,
- the exact WC public earning participant CLI,
- the exact pilot and verified-receipt acceptance implementations,
- the trusted coordinator identity,
- and a private execution output directory.

## Commands

Stage a plan:

```bash
tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts stage \
  --submission-receipt /private/submission-receipt.json \
  --work-order /private/work-order.json \
  --binding-registry /private/credential-wc-account-binding-registry.json \
  --selected-contract-receipt /private/selected-adapter-contract-capture-receipt-v1.json \
  --ticket /private/one-use-ticket.json \
  --participant-cli /repo/ops/mainnet0/wc-public-earning-participant-v1.sh \
  --pilot-source /repo/src/economic/wc_public_earning_pilot_v1.ts \
  --acceptance-source /repo/src/economic/wc_verified_receipt_acceptance_v1.ts \
  --coordinator-base https://trusted-coordinator.example \
  --coordinator-node-id 0123456789abcdef0123456789abcdef \
  --output-dir /private/adapter-operation \
  --created-at-utc 2026-07-28T12:30:00.000Z \
  --expires-at-utc 2026-07-28T12:40:00.000Z \
  --nonce paid-work-adapter-operation-v1
```

Inspect without executing:

```bash
tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts inspect \
  --plan /private/adapter-operation/plan-v1.json \
  --binding-registry /private/credential-wc-account-binding-registry.json
```

Execute once:

```bash
tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts execute \
  --plan /private/adapter-operation/plan-v1.json \
  --binding-registry /private/credential-wc-account-binding-registry.json \
  --receipt /private/adapter-operation/adapter-execution-receipt-v1.json \
  --confirm execute-agent-paid-work-wc-earning-adapter-v1
```

## Authority boundary

The adapter authorizes only the selected participant CLI to consume the private
one-use capability ticket. The participant CLI remains the only capability-token
consumer.

A successful adapter execution must prove:

- the exact authenticated paid-work submission and active WC-account binding,
- the exact selected runtime file hashes,
- one ticket-bound `datanet_fetch_verify` execution,
- a signed, verified remote receipt,
- exactly one append-once 3 WC credit,
- exact canonical `before + 3 = after`,
- ticket deletion only after exact green,
- and a private immutable adapter receipt.

The adapter does not authorize payment transfer, WC-to-VOID settlement, wallet
or signer access, service restart, deployment, Buy VOID fulfillment, generic
crediting, or an automatic background loop.

## Crash and replay behavior

If the participant completed exact green but the adapter receipt was not yet
written, the adapter may recover from the single private sanitized participant
receipt without invoking the participant again.

If the adapter receipt already exists and validates against the same plan, a
repeat execution returns `duplicate: true` and does not invoke the participant
CLI or create a second WC credit.

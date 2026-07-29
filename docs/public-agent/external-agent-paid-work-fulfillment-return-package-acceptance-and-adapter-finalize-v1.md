# External-Agent Paid-Work Return-Package Acceptance and Adapter Finalize V1

## Purpose

This is the final Precision-side state-machine executor for reusable external-agent paid-work fulfillment. It consumes the sanitized return package produced by the Nimo receive-and-run lane, accepts the verified participant receipt, invokes the canonical paid-work WC adapter, verifies duplicate-finalization suppression, and advances the private fulfillment plan to `completed`.

## Ordering

The executor verifies and persists each boundary before the next mutation:

1. Precision coordinator identity and the active credential-to-WC-account binding.
2. The `executor_receipt_expected` source plan and return-package hashes.
3. The generic fulfillment event whose `to_state` is `adapter_finalization_planned`.
4. The participant receipt, executor receipt, ticket consumption, token deletion, and exact fixed WC delta.
5. Private operation state before verified-receipt acceptance.
6. Private operation state before canonical adapter execution.
7. The adapter receipt before an idempotent duplicate probe.
8. A `completed` fulfillment event, completed plan, sanitized completion receipt, and public-evidence candidate.

## Crash and replay behavior

The operation has separate ambiguous holds for receipt acceptance, adapter execution, and the duplicate probe. A normal retry cannot cross an ambiguous phase. Recovery requires the exact raw result under the explicit recovery confirmation.

After completion, identical execution returns the stored result without a second acceptance, adapter execution, duplicate probe, or WC credit.

## Commands

```bash
tsx scripts/external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts execute \
  --input /private/finalization-input-v1.json \
  --output-dir /private/finalization-operation \
  --confirm execute-external-agent-paid-work-return-acceptance-adapter-finalize-v1
```

```bash
tsx scripts/external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts recover \
  --input /private/finalization-input-v1.json \
  --output-dir /private/finalization-operation \
  --raw-result /private/exact-raw-result-v1.json \
  --confirm recover-external-agent-paid-work-return-acceptance-adapter-finalize-v1
```

```bash
tsx scripts/external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts inspect \
  --output-dir /private/finalization-operation
```

## Authority boundary

This lane may accept one verified participant receipt and perform one canonical adapter WC credit plus an idempotent duplicate probe. It cannot issue or transfer a ticket, execute remote work, move money, settle WC to VOID, access a wallet or signer, restart a service, deploy code, or run as an automatic background loop.

Build and CI proof use mock acceptance, adapter, and host transports. They do not touch the live WC ledger.

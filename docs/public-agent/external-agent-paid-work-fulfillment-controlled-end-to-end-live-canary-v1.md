# Controlled end-to-end live fulfillment canary V1

This controller is the final gated operator surface for one complete external-agent paid-work fulfillment cycle. It binds the reusable fulfillment stack from accepted submission through one ticket, one transfer, one Nimo execution, one verified receipt acceptance, one canonical three-WC credit, an idempotent duplicate probe, and a completed fulfillment plan.

## Safety model

The controller has no background loop. Every irreversible phase requires its own exact confirmation token. It persists a private attempt record before invoking the phase transport. If a transport becomes ambiguous after the attempt begins, the operation enters a held state and will not retry automatically. Recovery requires an exact private raw-result artifact and the same phase confirmation.

A live manifest additionally requires `--allow-live`. Build and CI use `mode: mock` and mock transports only.

## Phase order

1. `issue_ticket` — one single-use ticket.
2. `transfer_package` — one private package transfer to the pinned Nimo identity.
3. `execute_on_nimo` — one participant CLI execution and one ticket consumption.
4. `accept_and_finalize` — one verified receipt acceptance and one canonical three-WC adapter credit.
5. `duplicate_probe_and_seal` — no second acceptance, adapter execution, or WC credit; write the completion seal.

## CLI

```text
prepare --manifest <private-manifest.json> --operation-dir <private-dir>
run-phase --operation-dir <private-dir> --phase <phase> --confirm <exact-token> [--allow-live]
recover-phase --operation-dir <private-dir> --phase <phase> --confirm <exact-token> --raw-result <private-result.json>
inspect --operation-dir <private-dir>
```

Operation directories are mode `0700`; operation files are mode `0600`. Raw capability tokens may exist only in private stage results needed by the next stage. Inspection output, phase receipts, the completion seal, and public evidence must not contain a raw token.

## Authority exclusions

The controller has no payment-transfer, WC-to-VOID settlement, wallet/signer, service-restart, deployment, or background-loop authority. The fixed live canary ceiling is one ticket and one three-WC credit.

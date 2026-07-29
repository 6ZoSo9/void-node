# Fresh canary credential lifecycle and WC binding V1

This controller prepares and executes a bounded credential lifecycle for the fresh end-to-end paid-work canary account.

## Phases

1. `request` — creates one fresh submit-only credential request. The raw credential token must remain on Nimo private storage and may not be returned to this controller.
2. `review` — records one explicit approval for the submit-only scope and the exact fresh WC account.
3. `activate` — activates the reviewed credential once.
4. `bind` — binds the active credential to `void-external-agent-e2e-fulfillment-canary-v1` once.
5. `duplicate_probe` — proves that the existing binding is returned idempotently and that no second active binding is created.

Every phase requires its own exact confirmation. Attempt state is persisted before transport. An ambiguous attempt enters `held` and cannot be retried automatically; exact raw-result recovery is required.

## Authority boundary

Build and CI use mock transports only. They do not issue or activate a live credential, write the live WC-account binding registry, submit authenticated work, prepare the live canary, issue a ticket, or write WC.

The eventual live credential is submit-only. The raw token remains on Nimo in mode-0600 private storage and must never appear in Precision logs, phase receipts, completion evidence, or repository content.

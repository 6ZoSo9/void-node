# Public Node First External Tester WC Ledger Write Boundary v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_DOC_V1`

Route:

`/public-node/first-external-tester-wc-ledger-write-boundary.json`

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcLedgerWriteBoundaryCard`

This is a public read-only boundary before any real Work Credit ledger write can exist.

Current state:

- `current_ledger_write_state=not_allowed`
- `ledger_write_allowed_now=false`
- `ledger_record_created_now=false`
- `ledger_entry_preview_created_now=false`
- `award_record_created_now=false`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

Required before a future real ledger write:

- operator review record approved
- operator decision record approved
- operator award intent packet approved
- operator award record approved
- operator ledger entry preview reviewed
- positive nonzero WC delta selected by operator
- duplicate ledger entry check green
- explicit operator ledger write confirmation
- ledger write runbook proof green

This route/card does not create a ledger record, write the WC ledger, award Work Credits, move tokens, send wallets, fulfill buys, mutate validators, or enable WC-to-VOID swaps.

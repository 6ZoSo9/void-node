# Public Node First External Tester WC Ledger Write Runbook Design v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_RUNBOOK_DESIGN_DOC_V1`

Status: design only.

This document defines the future explicit operator process for a real Work Credit ledger write.

It does not create a ledger write runbook.

It does not create a ledger record.

It does not mutate the Work Credit ledger.

It does not award Work Credits.

It does not move VOID.

It does not perform a WC-to-VOID swap.

It does not send a wallet transaction.

It does not perform buy fulfillment.

It does not mutate validators.

## Current boundary

The current public boundary route is:

`/public-node/first-external-tester-wc-ledger-write-boundary.json`

Expected current state:

- `boundary_state=pre_ledger_write_boundary_no_ledger_record_created`
- `current_ledger_write_state=not_allowed`
- `ledger_write_allowed_now=false`
- `ledger_record_created_now=false`
- `ledger_entry_preview_created_now=false`
- `award_record_created_now=false`
- `award_created_now=false`
- `award_write_allowed_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

## Required source chain before any future ledger write

A future explicit ledger write runbook must require all of the following source artifacts:

1. First external tester evidence candidate.
2. Review checklist.
3. Operator decision packet.
4. Operator decision draft.
5. Operator review record.
6. Operator decision record.
7. Operator award intent packet.
8. Operator award record.
9. Operator ledger entry preview.
10. Ledger write boundary route proving the current state is still locked.

## Required approved states before any future ledger write

A future explicit ledger write runbook must fail closed unless all of the following are true:

- operator review record is approved
- operator decision record is approved
- operator award intent packet is approved
- operator award record is approved
- operator ledger entry preview is reviewed
- positive nonzero WC delta is selected by the operator
- duplicate ledger-entry check is green
- candidate id matches the expected first external tester candidate
- source hashes match the latest approved chain
- explicit operator confirmation string is present
- ledger write dry-run preview passes
- final proof confirms the ledger write target before write

## Required future confirmation string

A future real ledger write runbook must require an explicit confirmation string.

Suggested future confirmation string:

`CONFIRM_WC_LEDGER_WRITE=I_UNDERSTAND_THIS_CREATES_A_REAL_WC_LEDGER_RECORD`

Without that exact confirmation, the future runbook must print:

- `explicit_confirmation_required=true`
- `confirmation_string_green=false`
- `ledger_record_created_now=false`
- `wc_ledger_write=false`

and exit nonzero.

## Required future duplicate checks

A future real ledger write runbook must check for duplicate ledger entries before writing.

Minimum duplicate dimensions:

- candidate id
- source award record hash
- source ledger entry preview hash
- operator id
- WC delta
- lane id
- ledger record type

A duplicate must fail closed with:

- `duplicate_ledger_entry_check_green=false`
- `ledger_record_created_now=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`

## Required future post-write proof

A future real ledger write runbook, once explicitly allowed, must emit a post-write proof containing:

- source candidate id
- source review record sha256
- source decision record sha256
- source award intent packet sha256
- source award record sha256
- source ledger entry preview sha256
- created ledger record id
- created ledger record sha256
- credited WC delta
- operator id
- timestamp
- duplicate check result
- no token movement
- no WC-to-VOID swap
- no wallet send
- no buy fulfillment
- no validator mutation

## Fail-closed conditions

A future real ledger write runbook must refuse to write if any of these are true:

- missing source artifact
- malformed source artifact
- source marker mismatch
- source candidate mismatch
- source hash mismatch
- review not approved
- decision not approved
- award intent not approved
- award record not approved
- ledger preview not reviewed
- preview WC delta is zero
- selected WC delta is zero
- selected WC delta differs from approved preview
- duplicate ledger entry detected
- explicit confirmation missing
- target ledger path missing or unsafe
- runtime directory is ambiguous
- public upload is attempted
- token movement is attempted
- wallet send is attempted
- WC-to-VOID swap is attempted
- buy fulfillment is attempted
- validator mutation is attempted

## Design-only safety constants

This design checkpoint must keep the following lines true:

- `ledger_write_runbook_created_now=false`
- `ledger_record_created_now=false`
- `ledger_write_allowed_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`
- `automatic_ledger_write_allowed=false`
- `money_movement=false`
- `wallet_send=false`
- `buy_void_fulfillment=false`
- `validator_mutation=false`

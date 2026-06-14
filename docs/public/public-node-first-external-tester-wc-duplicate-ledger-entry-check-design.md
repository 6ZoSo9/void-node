# Public Node First External Tester WC Duplicate Ledger Entry Check Design v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_DOC_V1`

Route:

`/public-node/first-external-tester-wc-duplicate-ledger-entry-check-design.json`

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_LEDGER_ENTRY_CHECK_DESIGN_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcDuplicateLedgerEntryCheckDesignCard`

This public read-only route/card defines the future duplicate ledger-entry check that must pass before any real first external tester Work Credit ledger write.

This is design-only.

It does not run the duplicate check.

It does not create a ledger record.

It does not mutate the Work Credit ledger.

It does not award Work Credits.

It does not move VOID.

## Required future duplicate dimensions

A future real duplicate check must compare at least:

- `candidate_id`
- `lane_id`
- `source_award_record_sha256`
- `source_ledger_entry_preview_sha256`
- `operator_id`
- `wc_delta`
- `ledger_record_type`
- `created_for_boundary_version`

## Current design-only state

- `design_state=duplicate_ledger_entry_check_design_only`
- `duplicate_ledger_entry_check_ready=false`
- `duplicate_ledger_entry_check_run_now=false`
- `duplicate_ledger_entry_detected_now=false`
- `duplicate_ledger_entry_check_result_now=not_run_design_only`
- `duplicate_ledger_entry_check_required_before_ledger_write=true`

## Protected boundary

- `duplicate_ledger_entry_check_design_only=true`
- `duplicate_ledger_entry_check_run_now=false`
- `duplicate_ledger_entry_detected_now=false`
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
- `automatic_ledger_write_allowed=false`

A future duplicate hit must fail closed with:

- `duplicate_ledger_entry_check_green=false`
- `duplicate_ledger_entry_detected=true`
- `ledger_record_created_now=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

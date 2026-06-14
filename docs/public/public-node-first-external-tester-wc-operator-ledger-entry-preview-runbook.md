# Public Node First External Tester WC Operator Ledger Entry Preview Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_V1

Status: explicit local ledger entry preview write.

This runbook reads the latest local award record and writes a local ledger entry preview for the first external tester Work Credit candidate.

Input award record:

.runtime/mainnet0/public-node/first-external-tester-wc-award-records/latest-award-record.json

Output ledger entry preview:

.runtime/mainnet0/public-node/first-external-tester-wc-ledger-entry-previews/latest-ledger-entry-preview.json

Archive ledger entry previews:

.runtime/mainnet0/public-node/first-external-tester-wc-ledger-entry-previews/archive/ledger-entry-preview-*.json

Required confirmation:

CONFIRM_LEDGER_PREVIEW_WRITE=I_UNDERSTAND_LEDGER_PREVIEW_ONLY

Allowed LEDGER_PREVIEW_STATE values:

- deferred
- ready_for_operator_ledger_review
- rejected

Default:

- deferred

Expected proof/runbook lines:

- operator_ledger_entry_preview_runbook_green=true
- ledger_entry_preview_written=true
- ledger_entry_preview_created_now=true
- ledger_preview_only=true
- operator_local_only=true
- award_record_created_now=false
- award_created_now=false
- award_write_allowed_now=false
- ledger_record_created_now=false
- wc_ledger_mutated_now=false
- wc_credit_delta_now=0
- preview_wc_delta=0
- wc_ledger_write=false
- wc_credit_award=false
- wc_to_void_swap=false
- automatic_ledger_write_allowed=false
- public_upload=false
- trusted_as_network_truth=false
- money_movement=false
- wallet_send=false
- buy_void_fulfillment=false
- validator_mutation=false

This creates a local ledger entry preview only. It does not create a Work Credit ledger record, Work Credit ledger write, Work Credit credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

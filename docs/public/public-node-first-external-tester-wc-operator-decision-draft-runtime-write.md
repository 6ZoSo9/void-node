# Public Node First External Tester WC Operator Decision Draft Runtime Write

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_V1

Status: opt-in local runtime write proof.

This proof verifies that the operator decision draft generator can write a local draft JSON only when explicitly invoked with WRITE_RUNTIME=true.

The proof writes to a scratch DATA_DIR, not the live runtime DATA_DIR.

## Source generator

- ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft.sh
- default WRITE_RUNTIME=false
- marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1

## Runtime write boundary

Expected proof lines:

- operator_decision_draft_runtime_write_green=true
- write_runtime_opt_in_required=true
- default_write_runtime_false_green=true
- scratch_runtime_write_green=true
- runtime_latest_draft_green=true
- runtime_archive_draft_green=true
- operator_decision_created_now=false
- review_record_created_now=false
- decision_record_created_now=false
- award_created_now=false
- wc_ledger_mutated_now=false
- wc_credit_delta_now=0
- wc_ledger_write=false
- wc_credit_award=false
- wc_to_void_swap=false
- automatic_ledger_write_allowed=false
- public_upload=false
- trusted_as_network_truth=false
- live_runtime_write=false

This proof does not create an award, review record, decision record, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.

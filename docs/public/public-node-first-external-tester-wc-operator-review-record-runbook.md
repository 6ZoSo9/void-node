# Public Node First External Tester WC Operator Review Record Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1

Status: explicit local operator review record write.

This runbook reads the latest local operator decision draft and writes a local operator review record for the first external tester Work Credit candidate.

Input draft:

.runtime/mainnet0/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json

Output review record:

.runtime/mainnet0/public-node/first-external-tester-wc-review-records/latest-review-record.json

Archive review records:

.runtime/mainnet0/public-node/first-external-tester-wc-review-records/archive/operator-review-record-*.json

Required confirmation:

CONFIRM_REVIEW_RECORD_WRITE=I_UNDERSTAND_REVIEW_RECORD_ONLY

Allowed REVIEW_OUTCOME values:

- accepted
- rejected
- deferred

Default:

- deferred

Expected proof/runbook lines:

- operator_review_record_runbook_green=true
- review_record_written=true
- review_record_created_now=true
- review_record_only=true
- operator_local_only=true
- operator_decision_created_now=false
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
- money_movement=false
- wallet_send=false
- buy_void_fulfillment=false
- validator_mutation=false

This creates a local review record only. It does not create a Work Credit award, Work Credit ledger write, Work Credit credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

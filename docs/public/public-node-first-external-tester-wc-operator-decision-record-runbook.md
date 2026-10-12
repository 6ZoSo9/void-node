# Public Node First External Tester WC Operator Decision Record Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1

Status: explicit local operator decision record write.

This runbook reads the latest local operator review record and writes a local operator decision record for the first external tester Work Credit candidate.

Input review record:

.runtime/mainnet0/public-node/first-external-tester-wc-review-records/latest-review-record.json

Output decision record:

.runtime/mainnet0/public-node/first-external-tester-wc-decision-records/latest-decision-record.json

Archive decision records:

.runtime/mainnet0/public-node/first-external-tester-wc-decision-records/archive/operator-decision-record-*.json

Required confirmation:

CONFIRM_DECISION_RECORD_WRITE=I_UNDERSTAND_DECISION_RECORD_ONLY

Allowed DECISION_OUTCOME values:

- accepted
- rejected
- deferred

Default:

- deferred

Expected proof/runbook lines:

- operator_decision_record_runbook_green=true
- decision_record_written=true
- decision_record_created_now=true
- decision_record_only=true
- operator_local_only=true
- operator_decision_created_now=false
- review_record_created_now=false
- award_created_now=false
- wc_ledger_mutated_now=false
- wc_credit_delta_now=0
- wc_ledger_write=false
- wc_credit_award=false
- wc_to_void_swap=false
- automatic_ledger_write_allowed=false
- award_write_allowed_now=false
- public_upload=false
- trusted_as_network_truth=false
- money_movement=false
- wallet_send=false
- buy_void_fulfillment=false
- validator_mutation=false

This creates a local decision record only. It does not create a Work Credit award, Work Credit ledger write, Work Credit credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

# Public Node First External Tester WC Operator Award Record Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_V1

Status: explicit local award record write.

This runbook reads the latest local award intent packet and writes a local award record for the first external tester Work Credit candidate.

Input award intent packet:

.runtime/mainnet0/public-node/first-external-tester-wc-award-intent-packets/latest-award-intent-packet.json

Output award record:

.runtime/mainnet0/public-node/first-external-tester-wc-award-records/latest-award-record.json

Archive award records:

.runtime/mainnet0/public-node/first-external-tester-wc-award-records/archive/award-record-*.json

Required confirmation:

CONFIRM_AWARD_RECORD_WRITE=I_UNDERSTAND_AWARD_RECORD_ONLY

Allowed AWARD_RECORD_STATE values:

- deferred
- approved
- rejected

Default:

- deferred

Expected proof/runbook lines:

- operator_award_record_runbook_green=true
- award_record_written=true
- award_record_created_now=true
- award_record_only=true
- operator_local_only=true
- award_created_now=false
- award_write_allowed_now=false
- wc_ledger_mutated_now=false
- wc_credit_delta_now=0
- proposed_wc_delta_only=true
- ledger_record_created_now=false
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

This creates a local award record only. It does not create a Work Credit ledger write, Work Credit credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

# Public Node First External Tester WC Operator Award Intent Packet Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_V1

Status: explicit local award intent packet write.

This runbook reads the latest local operator decision record and writes a local award intent packet for the first external tester Work Credit candidate.

Input decision record:

.runtime/mainnet0/public-node/first-external-tester-wc-decision-records/latest-decision-record.json

Output award intent packet:

.runtime/mainnet0/public-node/first-external-tester-wc-award-intent-packets/latest-award-intent-packet.json

Archive award intent packets:

.runtime/mainnet0/public-node/first-external-tester-wc-award-intent-packets/archive/award-intent-packet-*.json

Required confirmation:

CONFIRM_AWARD_INTENT_WRITE=I_UNDERSTAND_AWARD_INTENT_ONLY

Allowed AWARD_INTENT_STATE values:

- deferred
- intend_award
- intend_no_award

Default:

- deferred

Expected proof/runbook lines:

- operator_award_intent_packet_runbook_green=true
- award_intent_packet_written=true
- award_intent_packet_created_now=true
- award_intent_only=true
- operator_local_only=true
- decision_record_created_now=false
- award_created_now=false
- award_write_allowed_now=false
- wc_ledger_mutated_now=false
- wc_credit_delta_now=0
- proposed_wc_delta_only=true
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

This creates a local award intent packet only. It does not create a Work Credit award, Work Credit ledger write, Work Credit credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

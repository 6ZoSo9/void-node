# Public Node First External Tester WC Operator Decision Draft Live Runbook

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1

Status: explicit local operator draft write.

This runbook creates an actual local live-runtime operator decision draft for the first external tester Work Credit candidate.

It writes only draft JSON under .runtime/mainnet0/public-node/first-external-tester-wc-operator-decision-drafts/.

Required confirmation:

CONFIRM_LIVE_DRAFT_WRITE=I_UNDERSTAND_DRAFT_ONLY

Expected proof/runbook lines:

- operator_decision_draft_live_runbook_green=true
- live_runtime_draft_written=true
- explicit_confirmation_required=true
- confirmation_string_green=true
- draft_only=true
- operator_local_only=true
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
- money_movement=false
- wallet_send=false
- buy_void_fulfillment=false
- validator_mutation=false

This is a local draft file only. It does not create an award, ledger write, WC credit award, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

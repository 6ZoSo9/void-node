# Public Node First External Tester WC Operator Decision Draft

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1

Status: local-only draft generator.

This lane turns the read-only operator decision packet into a local draft JSON for operator review.

It does not create a review record, decision record, Work Credit award, Work Credit ledger write, token movement, wallet send, WC to VOID swap, buy fulfillment, or validator mutation.

## Inputs

Source packet:

- /public-node/first-external-tester-wc-operator-decision-packet.json
- marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1
- packet_state: template_only_no_operator_decision_created

Supported draft decision states:

- accepted
- rejected
- deferred

Default state:

- deferred

## Safety boundary

Expected generator/proof lines:

- operator_decision_draft_green=true
- operator_decision_draft_only=true
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
- write_runtime_default=false

The draft file is evidence for human/operator review only. A later lane may separately consume an accepted draft, but only behind another explicit proof boundary.

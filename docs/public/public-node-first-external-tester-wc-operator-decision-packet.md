# First External Tester WC Operator Decision Packet

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1`

Route: `/public-node/first-external-tester-wc-operator-decision-packet.json`

This is a public read-only operator decision packet template for the first external tester Work Credit lane.

It does not create a real operator decision. It does not create a review record. It does not create an award. It does not mutate the Work Credit ledger. It does not enable WC→VOID swaps.

Allowed future decision states are:

- `accepted`
- `rejected`
- `deferred`

Current state remains:

- `not_decided`

Safety flags remain false:

- `operator_decision_created_now=false`
- `review_record_created_now=false`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_decision_record_write=false`
- `wc_review_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`
- `automatic_ledger_write_allowed=false`
- `public_upload=false`
- `trusted_as_network_truth=false`

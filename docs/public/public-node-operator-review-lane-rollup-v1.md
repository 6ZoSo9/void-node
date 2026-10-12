# Public Node Operator Review Lane Rollup v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1`

Status: `operator_review_lane_rollup_ready`

This is a public-safe status rollup for the outside-node-operator receipt review lane.
It ties together the handoff packet, receipt example, review checklist, decision template, decision example, and their closeouts.

This rollup creates no receipt, no actual review decision, no Work Credit claim, no validator admission, no wallet action, and no money movement.

Routes:

- review_lane_rollup_page: `/public-node/operator-review-lane-rollup-v1`
- review_lane_rollup_json: `/public-node/public-node-operator-review-lane-rollup-v1.json`
- review_lane_rollup_html: `/public-node/public-node-operator-review-lane-rollup-v1.html`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- handoff_packet: `/public-node/operator-handoff-packet-v1`
- handoff_packet_json: `/public-node/public-node-operator-handoff-packet-v1.json`
- receipt_example: `/public-node/operator-receipt-example-v1`
- receipt_example_json: `/public-node/public-node-operator-receipt-example-v1.json`
- review_checklist: `/public-node/operator-receipt-review-checklist-v1`
- review_checklist_json: `/public-node/public-node-operator-receipt-review-checklist-v1.json`
- decision_template: `/public-node/operator-receipt-review-decision-template-v1`
- decision_template_json: `/public-node/public-node-operator-receipt-review-decision-template-v1.json`
- decision_example: `/public-node/operator-receipt-review-decision-example-v1`
- decision_example_json: `/public-node/public-node-operator-receipt-review-decision-example-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Review sequence:

1. `read_operator_status_rollup` — green — `/public-node/operator-status-rollup-v1`
2. `follow_operator_handoff_packet` — green — `/public-node/operator-handoff-packet-v1`
3. `compare_against_receipt_example` — green — `/public-node/operator-receipt-example-v1`
4. `review_with_manual_checklist` — green — `/public-node/operator-receipt-review-checklist-v1`
5. `use_static_decision_template` — green — `/public-node/operator-receipt-review-decision-template-v1`
6. `compare_against_static_decision_example` — green — `/public-node/operator-receipt-review-decision-example-v1`

Green components:

- `operator_status_rollup` — green — `VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN` — `/public-node/operator-status-rollup-v1`
- `operator_quickstart` — green — `VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN` — `/public-node/operator-quickstart-v1`
- `operator_handoff_packet` — green — `VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN` — `/public-node/operator-handoff-packet-v1`
- `operator_receipt_example` — green — `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN` — `/public-node/operator-receipt-example-v1`
- `operator_receipt_review_checklist` — green — `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN` — `/public-node/operator-receipt-review-checklist-v1`
- `operator_receipt_review_decision_template` — green — `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN` — `/public-node/operator-receipt-review-decision-template-v1`
- `operator_receipt_review_decision_example` — green — `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1` — closeout `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_CLOSEOUT_V1_GREEN` — `/public-node/operator-receipt-review-decision-example-v1`
- `public_node_connect_lane` — green — `VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN` — `/public-node/connect`
- `connect_pack` — green — `VOID_PUBLIC_NODE_CONNECT_PACK_V1` — `/public-node/connect/public-node-connect-pack-v1.json`
- `receipt_template` — green — `VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1` — `/public-node/connect/public-node-connect-receipt-template-v1.json`
- `bootstrap_gateway` — green — `VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1` — `/bootstrap/peers.json`

Boundary:

- Read-only public routes only.
- Operator review lane rollup only.
- Operator status visibility only.
- Operator guidance only.
- Rollup creates no receipt.
- Rollup creates no review decision.
- Rollup creates no Work Credit claim.
- Rollup creates no validator admission.
- Rollup creates no money movement.
- Not automatic peer dialing.
- Not mutation route enablement.
- Not wallet send enablement.
- Not money movement.
- Not buy VOID fulfillment.
- Not WC to VOID settlement.
- Not validator mutation or validator admission.
- Not public Work Credit self-serve earning.
- Not Work Credit claim creation.
- Not a public internet mesh claim.
- Do not share private keys, seed phrases, wallet secrets, signer secrets, private IPs, or private operator data.

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1_GREEN`

# Public Node Operator Dashboard v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1`

Status: `operator_dashboard_ready`

This is a single public-safe human-facing dashboard for outside-node-operator onboarding and review-lane navigation.

It gathers status, quickstart, connect pack, handoff packet, receipt example, review checklist, decision template/example, sealed review-lane rollup, bootstrap, and runtime smoke surfaces.

This dashboard creates no receipt, no review decision, no Work Credit claim, no validator admission, no wallet action, and no money movement.

Routes:

- dashboard_page: `/public-node/operator-dashboard-v1`
- dashboard_json: `/public-node/public-node-operator-dashboard-v1.json`
- dashboard_html: `/public-node/public-node-operator-dashboard-v1.html`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- operator_review_lane_rollup: `/public-node/operator-review-lane-rollup-v1`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- handoff_packet: `/public-node/operator-handoff-packet-v1`
- receipt_example: `/public-node/operator-receipt-example-v1`
- review_checklist: `/public-node/operator-receipt-review-checklist-v1`
- decision_template: `/public-node/operator-receipt-review-decision-template-v1`
- decision_example: `/public-node/operator-receipt-review-decision-example-v1`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`
- runtime_index: `/public-node/runtime/index.json`
- runtime_smoke_pack: `/public-node/runtime/smoke-pack-v1.sh`

Recommended operator path:

1. `read_status` — `/public-node/operator-status-rollup-v1`
2. `follow_quickstart` — `/public-node/operator-quickstart-v1`
3. `use_connect_pack` — `/public-node/connect`
4. `read_handoff_packet` — `/public-node/operator-handoff-packet-v1`
5. `compare_receipt_example` — `/public-node/operator-receipt-example-v1`
6. `manual_review_checklist` — `/public-node/operator-receipt-review-checklist-v1`
7. `decision_template_and_example` — `/public-node/operator-receipt-review-decision-template-v1` — related `/public-node/operator-receipt-review-decision-example-v1`
8. `confirm_review_lane_rollup` — `/public-node/operator-review-lane-rollup-v1`

Dashboard sections:

- `status` — Operator status — green — `/public-node/operator-status-rollup-v1`
- `start` — Operator quickstart — green — `/public-node/operator-quickstart-v1`
- `connect` — Connect pack — green — `/public-node/connect`
- `handoff` — Operator handoff packet — green — `/public-node/operator-handoff-packet-v1`
- `receipt_example` — Receipt example — green — `/public-node/operator-receipt-example-v1`
- `review` — Review checklist and decision surfaces — green — `/public-node/operator-receipt-review-checklist-v1`
- `sealed_review_lane` — Sealed review lane — green — `/public-node/operator-review-lane-rollup-v1`
- `bootstrap` — Bootstrap and runtime checks — green — `/bootstrap/peers.json`

Boundary:

- Read-only public routes only.
- Operator dashboard only.
- Human-facing navigation only.
- Operator guidance only.
- Dashboard creates no receipt.
- Dashboard creates no review decision.
- Dashboard creates no Work Credit claim.
- Dashboard creates no validator admission.
- Dashboard creates no money movement.
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

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1_GREEN`

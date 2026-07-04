# Public Node Operator Receipt Review Checklist v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1`

Status: `operator_receipt_review_checklist_ready`

This is a public-safe manual checklist for reviewing a returned outside-node-operator receipt.
It does not create a receipt, review decision, wallet action, validator admission, Work Credit claim, or money movement.

Routes:

- review_checklist_page: `/public-node/operator-receipt-review-checklist-v1`
- review_checklist_json: `/public-node/public-node-operator-receipt-review-checklist-v1.json`
- review_checklist_html: `/public-node/public-node-operator-receipt-review-checklist-v1.html`
- receipt_example: `/public-node/operator-receipt-example-v1`
- receipt_example_json: `/public-node/public-node-operator-receipt-example-v1.json`
- handoff_packet: `/public-node/operator-handoff-packet-v1`
- handoff_packet_json: `/public-node/public-node-operator-handoff-packet-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Review steps:

1. `confirm_public_safe_shape` — manual_review_required — Confirm the submitted receipt matches the public-safe receipt template/example shape.
2. `confirm_required_observations` — manual_review_required — Confirm operator alias, public node id, observed bootstrap route, observed markers, peer count, timestamp, and public-safe notes are present.
3. `reject_private_material` — manual_review_required — Reject receipts containing private keys, seed phrases, wallet secrets, signer secrets, private operator data, or unauthorized private IP material.
4. `reject_money_or_claim_language` — manual_review_required — Reject receipts that claim money movement, buy VOID fulfillment, WC settlement, Work Credit claim creation, validator admission, or public internet mesh status.
5. `confirm_marker_consistency` — manual_review_required — Confirm observed markers match the handoff packet, status rollup, connect pack, receipt template, and bootstrap gateway markers.
6. `record_review_outcome_elsewhere` — manual_review_required — This checklist does not write a review outcome. Any future decision record must be a separate explicit operator-reviewed lane.

Required receipt fields:

- `operator_alias`
- `operator_node_id`
- `operator_public_base_url_if_any`
- `observed_bootstrap_route`
- `observed_connect_pack_marker`
- `observed_status_rollup_marker`
- `observed_handoff_packet_marker`
- `observed_receipt_template_marker`
- `observed_peer_count`
- `observed_timestamp_utc`
- `public_safe_notes`

Reject if present:

- `private_key`
- `seed_phrase`
- `wallet_secret`
- `signer_secret`
- `unauthorized_private_ip`
- `private_operator_data`
- `money_transfer_claim`
- `buy_void_fulfillment_claim`
- `wc_to_void_settlement_claim`
- `validator_admission_claim`
- `work_credit_claim`
- `public_internet_mesh_claim`

Boundary:

- Read-only public routes only.
- Operator receipt review checklist only.
- Manual review checklist only.
- Operator guidance only.
- Checklist creates no receipt.
- Checklist creates no review decision.
- Checklist creates no Work Credit claim.
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

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1_GREEN`

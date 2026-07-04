# Public Node Operator Receipt Review Decision Template v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1`

Status: `operator_receipt_review_decision_template_ready`

This is a public-safe template for a human operator's receipt review outcome.
It does not create a receipt, review decision, Work Credit claim, validator admission, wallet action, or money movement.

Routes:

- decision_template_page: `/public-node/operator-receipt-review-decision-template-v1`
- decision_template_json: `/public-node/public-node-operator-receipt-review-decision-template-v1.json`
- decision_template_html: `/public-node/public-node-operator-receipt-review-decision-template-v1.html`
- review_checklist: `/public-node/operator-receipt-review-checklist-v1`
- review_checklist_json: `/public-node/public-node-operator-receipt-review-checklist-v1.json`
- receipt_example: `/public-node/operator-receipt-example-v1`
- receipt_example_json: `/public-node/public-node-operator-receipt-example-v1.json`
- handoff_packet: `/public-node/operator-handoff-packet-v1`
- handoff_packet_json: `/public-node/public-node-operator-handoff-packet-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Allowed outcomes:

- `receipt_public_safe_acceptance_candidate`
- `receipt_rejected_private_material`
- `receipt_rejected_claim_language`
- `needs_more_information`
- `deferred_no_action`

Decision template fields:

- `reviewer_alias`
- `receipt_reference`
- `review_checklist_marker`
- `observed_receipt_example_marker`
- `observed_handoff_packet_marker`
- `observed_receipt_template_marker`
- `review_outcome`
- `review_reason`
- `public_safe_notes`
- `reviewed_timestamp_utc`

Example decision template:

```json
{
  "decision_schema": "void.public_node.operator_receipt_review_decision.template.v1",
  "money_transfer_claim": false,
  "observed_handoff_packet_marker": "VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1",
  "observed_receipt_example_marker": "VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1",
  "observed_receipt_template_marker": "VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1",
  "private_material_included": false,
  "public_internet_mesh_claim": false,
  "public_safe_notes": "Template only. This does not create a review decision, Work Credit claim, validator admission, wallet action, or money movement.",
  "receipt_created": false,
  "receipt_reference": "example-public-safe-receipt-reference",
  "review_checklist_marker": "VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1",
  "review_decision_created": false,
  "review_outcome": "needs_more_information",
  "review_reason": "Example only. Replace this with a public-safe human review note.",
  "reviewed_timestamp_utc": "2026-07-04T00:00:00Z",
  "reviewer_alias": "example-human-reviewer",
  "template_only": true,
  "validator_admission_claim": false,
  "work_credit_claim_created": false
}
```

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
- Operator receipt review decision template only.
- Manual review template only.
- Operator guidance only.
- Template creates no receipt.
- Template creates no review decision.
- Template creates no Work Credit claim.
- Template creates no validator admission.
- Template creates no money movement.
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

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1_GREEN`

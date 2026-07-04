# Public Node Operator Receipt Example v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1`

Status: `operator_receipt_example_ready`

This is a public-safe example receipt for an outside VOID node operator.
It demonstrates what an operator may return after following the handoff packet and receipt template.

This example creates no receipt, no claim, no wallet action, no validator admission, and no Work Credit award.

Routes:

- receipt_example_page: `/public-node/operator-receipt-example-v1`
- receipt_example_json: `/public-node/public-node-operator-receipt-example-v1.json`
- receipt_example_html: `/public-node/public-node-operator-receipt-example-v1.html`
- handoff_packet: `/public-node/operator-handoff-packet-v1`
- handoff_packet_json: `/public-node/public-node-operator-handoff-packet-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- operator_status_rollup_json: `/public-node/public-node-operator-status-rollup-v1.json`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Example receipt:

```json
{
  "example_only": true,
  "money_transfer_claim": false,
  "observed_bootstrap_route": "/bootstrap/peers.json",
  "observed_connect_pack_marker": "VOID_PUBLIC_NODE_CONNECT_PACK_V1",
  "observed_handoff_packet_marker": "VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1",
  "observed_peer_count": 1,
  "observed_receipt_template_marker": "VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1",
  "observed_status_rollup_marker": "VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1",
  "observed_timestamp_utc": "2026-07-04T00:00:00Z",
  "operator_alias": "example-outside-node-operator",
  "operator_node_id": "example-node-id-public-safe-placeholder",
  "operator_public_base_url_if_any": "https://example.invalid/void-public-node",
  "private_material_included": false,
  "public_internet_mesh_claim": false,
  "public_safe_notes": "Example only. Replace placeholders with public-safe operator observations. Do not include private keys, seed phrases, wallet secrets, signer secrets, private operator data, money transfer claims, validator claims, or Work Credit claims.",
  "receipt_schema": "void.public_node.operator_receipt.example.v1",
  "validator_admission_claim": false,
  "work_credit_claim": false
}
```

Forbidden receipt fields:

- `private_key`
- `seed_phrase`
- `wallet_secret`
- `signer_secret`
- `private_ip_unless_operator_explicitly_allows`
- `money_transfer_claim`
- `validator_admission_claim`
- `work_credit_claim`

Boundary:

- Read-only public routes only.
- Operator receipt example only.
- Receipt example only.
- Operator guidance only.
- Example creates no receipt.
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

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1_GREEN`

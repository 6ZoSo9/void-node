# Public Node Operator Handoff Packet v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1`

Status: `operator_handoff_packet_ready`

This is a public-safe handoff packet for an outside VOID node operator.
It points the operator to the current green status rollup, quickstart, bootstrap routes, connect pack, and receipt template.

Routes:

- handoff_packet_page: `/public-node/operator-handoff-packet-v1`
- handoff_packet_json: `/public-node/public-node-operator-handoff-packet-v1.json`
- handoff_packet_html: `/public-node/public-node-operator-handoff-packet-v1.html`
- operator_status_rollup: `/public-node/operator-status-rollup-v1`
- operator_status_rollup_json: `/public-node/public-node-operator-status-rollup-v1.json`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- operator_quickstart_json: `/public-node/public-node-operator-quickstart-v1.json`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Recipient steps:

1. Open the operator status rollup — `/public-node/operator-status-rollup-v1` — Confirm the public operator lane currently reports green before attempting a node connection.
2. Read the operator quickstart — `/public-node/operator-quickstart-v1` — Follow the human operator sequence before sharing any public-safe evidence.
3. Fetch bootstrap metadata — `/__void/public-bootstrap.json` — Read network identity and chain information.
4. Fetch bootstrap peers — `/bootstrap/peers.json` — Read public bootstrap peer hints only.
5. Use the connect pack — `/public-node/connect` — Manually connect a node operator to the advertised local/public bootstrap lane.
6. Fill the receipt template — `/public-node/connect/receipt-template-v1` — Return public-safe connection evidence without keys, wallet data, money movement, or validator claims.

Required public-safe receipt fields:

- `operator_alias`
- `operator_node_id`
- `operator_public_base_url_if_any`
- `observed_bootstrap_route`
- `observed_connect_pack_marker`
- `observed_status_rollup_marker`
- `observed_peer_count`
- `observed_timestamp_utc`
- `public_safe_notes`

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
- Operator handoff packet only.
- Operator guidance only.
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
- Do not share private keys, seed phrases, wallet secrets, signer secrets, or private operator data.

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1_GREEN`

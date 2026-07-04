# VOID Public Node Operator Quickstart v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1`

Purpose: a human-friendly public entry point for outside operators who want to connect a VOID node.

Use this order:

1. Read bootstrap info: `/__void/public-bootstrap.json`
2. Fetch bootstrap peers: `/bootstrap/peers.json`
3. Open connect pack: `/public-node/connect`
4. Dial a peer manually: `/public-node/connect/public-node-connect-pack-v1.json`
5. Verify local health and peers: `/health and /peers on the operator node`
6. Fill public-safe receipt template: `/public-node/connect/receipt-template-v1`
7. Share only public-safe receipt evidence: `/public-node/connect/public-node-connect-receipt-template-v1.json`


Routes:

- quickstart_page: `/public-node/operator-quickstart-v1`
- quickstart_json: `/public-node/public-node-operator-quickstart-v1.json`
- quickstart_html: `/public-node/public-node-operator-quickstart-v1.html`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_network: `/bootstrap/network.json`
- bootstrap_peers: `/bootstrap/peers.json`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`

Safety checklist:

- do not share private keys
- do not share seed phrases
- do not share wallet secrets
- do not share .env files
- do not share full private logs
- do not share screenshots with secrets visible

Boundary: this quickstart is read-only operator guidance. It is not automatic peer dialing, not a mutation route, not wallet movement, not money movement, not buy VOID fulfillment, not WC settlement, not validator admission, not Work Credit claim creation, and not a public internet mesh claim.

Expected green marker: `VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1_GREEN`

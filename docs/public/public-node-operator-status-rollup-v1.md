# VOID Public Node Operator Status Rollup v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1`

Status: `operator_status_rollup_ready`

Purpose: one public status card for the public node operator path.

Green surfaces:

- operator_quickstart: `green` / `VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1` / `/public-node/operator-quickstart-v1`
- connect_lane: `green` / `VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN` / `/public-node/connect`
- connect_pack: `green` / `VOID_PUBLIC_NODE_CONNECT_PACK_V1` / `/public-node/connect/public-node-connect-pack-v1.json`
- receipt_template: `green` / `VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1` / `/public-node/connect/public-node-connect-receipt-template-v1.json`
- bootstrap: `green` / `VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1` / `/bootstrap/peers.json`

Routes:

- status_rollup_page: `/public-node/operator-status-rollup-v1`
- status_rollup_json: `/public-node/public-node-operator-status-rollup-v1.json`
- status_rollup_html: `/public-node/public-node-operator-status-rollup-v1.html`
- operator_quickstart: `/public-node/operator-quickstart-v1`
- operator_quickstart_json: `/public-node/public-node-operator-quickstart-v1.json`
- connect_pack: `/public-node/connect`
- connect_pack_json: `/public-node/connect/public-node-connect-pack-v1.json`
- receipt_template: `/public-node/connect/receipt-template-v1`
- receipt_template_json: `/public-node/connect/public-node-connect-receipt-template-v1.json`
- bootstrap_public: `/__void/public-bootstrap.json`
- bootstrap_peers: `/bootstrap/peers.json`

Boundary: this rollup is read-only status visibility only. It is not automatic peer dialing, not mutation, not wallet movement, not money movement, not buy VOID fulfillment, not WC settlement, not validator admission, not Work Credit claim creation, and not a public internet mesh claim.

Expected green marker: `VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1_GREEN`

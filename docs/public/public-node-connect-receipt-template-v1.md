# VOID Public Node Connect Receipt Template v1

Marker: `VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1`

Purpose: public-safe receipt template for outside operators who connected a VOID node.

Pairs with Public Node Connect Pack v1.

Template:

VOID public node connect receipt v1

timestamp_utc:
operator_label:
node_id:
local_health_ready:
local_health_head:
local_health_peers:
peer_address_dialed:
bootstrap_route_used:
bootstrap_host_used:
peers_output_summary:
connect_result:
notes:

Safe evidence: /health output, /peers output, bootstrap route used, peer address dialed, timestamp, node id, and whether the peer appeared in peers.

Do not include private keys, seed phrases, wallet secrets, .env files, full private logs, machine secrets, private IPs that should remain private, home address or personal identity data, wallet seed data, or screenshots with secrets visible.

Boundary: this receipt is not validator admission, not staking, not a Work Credit claim, not wallet movement, not token movement, not buy VOID fulfillment, not WC settlement, not mutation authority, and not a public internet mesh claim.

Expected green marker: `VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1_GREEN`

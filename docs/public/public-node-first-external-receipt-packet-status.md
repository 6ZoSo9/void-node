# Public Node First External Receipt Packet Status v1 <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_DOC_V1 -->

Public route:

    /public-node/first-external-receipt-packet-status.json

Expected marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1

Route marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_ROUTE_V1

Purpose:

    public_node_first_external_receipt_packet_status

This route is a public, read-only discovery status for the first external receipt packet.

It does not expose the packet archive itself. It only states that the operator-local packet export and archive export are ready.

Expected truths:

    packet_export_ready=true
    packet_archive_ready=true
    packet_archive_sha256_ready=true
    public_archive_download=false
    operator_local_export_only=true
    public_upload=false
    public_post_endpoint=false
    operator_local_import_only=true
    trusted_as_network_truth=false
    expected_receipt_file=tester-receipt.json
    expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

Safety boundary:

    public_routes_only=true
    private_api=false
    mutation=false
    read_only=true
    money_movement=false
    wallet_send=false
    wc_to_void_swap=false
    buy_void_fulfillment=false
    validator_mutation=false

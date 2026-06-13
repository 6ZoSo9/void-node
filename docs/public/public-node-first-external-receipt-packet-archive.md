# Public Node First External Receipt Packet Archive v1 <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_DOC_V1 -->

Operator-local script:

    ops/mainnet0/public-node-first-external-receipt-packet-archive.sh

Expected marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1

Purpose:

    public_node_first_external_receipt_packet_archive

The script runs the first external receipt packet export, then creates:

    first-external-receipt-packet.tar.gz
    first-external-receipt-packet.tar.gz.sha256

The archive is operator-local. It is meant to be sent manually or stored as evidence.

Safety boundary:

    public_upload=false
    operator_local_import_only=true
    trusted_as_network_truth=false
    money_movement=false
    wallet_send=false
    wc_to_void_swap=false
    buy_void_fulfillment=false
    validator_mutation=false

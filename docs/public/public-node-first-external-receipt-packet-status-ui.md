# Public Node First External Receipt Packet Status UI v1 <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_DOC_V1 -->

Public page:

    /public-node

Card id:

    publicNodeFirstExternalReceiptPacketStatusCard

UI marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1

Linked JSON route:

    /public-node/first-external-receipt-packet-status.json

The card is a human-visible companion to the machine-readable packet status route.

It states:

    packet_export=ready
    packet_archive_sha256=ready
    public_archive_download=false
    public_upload=false
    operator_local_export_only=true
    trusted_as_network_truth=false

Safety boundary:

The public node shows the status only. It does not expose the local packet archive, does not enable public uploads, and does not trust tester receipts as network truth without operator-local import.

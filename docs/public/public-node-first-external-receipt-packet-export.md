# Public Node First External Receipt Packet Export v1 <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_DOC_V1 -->

Operator-local script:

    ops/mainnet0/public-node-first-external-receipt-packet-export.sh

Expected marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1

Purpose:

    public_node_first_external_receipt_packet_export

The script exports a single local packet folder for the first outside tester receipt request.

It writes:

    first-external-receipt-packet/
      README.txt
      first-external-receipt-ask.txt
      first-external-receipt-ask.json
      closeout-status.json
      tester-lane-summary.json
      real-data-import-lane-status.json
      packet-manifest.json

The packet is operator-local. It does not create a public upload endpoint.

Safety boundary:

    public_routes_only=true
    public_upload=false
    operator_local_import_only=true
    money_movement=false
    wallet_send=false
    wc_to_void_swap=false
    buy_void_fulfillment=false
    validator_mutation=false
    trusted_as_network_truth=false

# Public Node First External Receipt Ask Export v1 <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_DOC_V1 -->

Operator-local script:

    ops/mainnet0/public-node-first-external-receipt-ask-export.sh

Expected marker:

    VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1

Purpose:

    public_node_first_external_receipt_ask_export

The script exports a paste/send-ready first external tester request from live public-node routes.

It reads:

    /public-node/first-tester-request-copy-pack.json
    /public-node/external-tester-receipt-closeout-status.json

It writes:

    first-external-receipt-ask.txt
    first-external-receipt-ask.json

The export includes:

    tester_share_page
    tester_lane_summary
    closeout_status
    real_data_import_lane_status
    standalone_smoke_command
    expected_green_marker
    expected_receipt_file=tester-receipt.json
    send_back_instruction

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

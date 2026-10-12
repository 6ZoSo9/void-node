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

## Public closeout URL guard <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_PUBLIC_CLOSEOUT_URL_DOC_V1 -->

The exported `closeout_status` must use the public/effective base URL from:

    /public-node/external-tester-receipt-closeout-status.json

It must not export an operator-local `127.0.0.1` closeout URL for outside testers when the node advertises a public effective base URL.

## Imported-state support <!-- VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_IMPORTED_STATE_DOC_V1 -->

The ask export supports both receipt states:

    waiting_for_external_receipt
    external_receipt_imported

After a real external tester receipt has been imported, the export remains useful as an audit/re-export packet. It must keep the same public closeout URL and safety boundary while reporting:

    receipt_state=external_receipt_imported
    latest_imported=true
    waiting_for_external_receipt=false
    trusted_as_network_truth=false

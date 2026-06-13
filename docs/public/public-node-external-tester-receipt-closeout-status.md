# Public Node External Tester Receipt Closeout Status v1 <!-- VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_DOC_V1 -->

Route:

    /public-node/external-tester-receipt-closeout-status.json

Expected marker:

    VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1

Purpose:

    public_node_external_tester_receipt_closeout_status

This route summarizes the first outside tester receipt closeout state without creating any public upload or mutation endpoint.

The source of truth remains:

    /public-node/tester-result-intake.json
    DATA_DIR/public-node/tester-result-intake/latest.json

Waiting state:

    waiting_for_external_receipt=true
    latest_imported=false
    latest_receipt_present=false

Imported state:

    waiting_for_external_receipt=false
    latest_imported=true
    latest_receipt_present=true

Safety boundary:

    public_routes_only=true
    public_post_endpoint=false
    operator_local_import_only=true
    mutation=false
    read_only=true
    money_movement=false
    wallet_send=false
    wc_to_void_swap=false
    buy_void_fulfillment=false
    validator_mutation=false
    trusted_as_network_truth=false

The safe import guard remains operator-local:

    ops/mainnet0/public-node-tester-receipt-safe-import.sh


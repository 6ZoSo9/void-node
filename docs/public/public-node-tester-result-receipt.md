# VOID Public Node Tester Result Receipt <!-- VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_DOC_V1 -->

Use this after running the public-node smoke check.

## Machine-readable template

    /public-node/tester-result-receipt.json

## Fill this out

    tester_name_or_handle=
    tested_node_url=
    tested_at_utc=
    browser_loaded_public_node=yes/no
    smoke_command_ok_routes=
    smoke_command_failed_routes=
    copied_error_output=
    notes=

## Expected OK routes

    /public-node
    /public-node/quickstart.json
    /public-node/tester-handoff.json
    /public-node/tester-result-receipt.json
    /public-node/route-index.json
    /public-node/external-base-url.json
    /public-node/public-exposure-smoke-pack.json
    /proofs

## Safety boundary

This receipt is for public-route testing only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

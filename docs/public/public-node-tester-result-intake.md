# VOID Public Node Tester Result Intake <!-- VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_DOC_V1 -->

Live public JSON route showing whether an outside tester result has been imported by the node operator.

## Route

    /public-node/tester-result-intake.json

## Purpose

This route lets the operator locally import a tester receipt and expose a read-only status saying whether an external test has been received.

The route is intentionally not a public submission endpoint.

## Import path

    DATA_DIR/public-node/tester-result-intake/latest.json

## Expected statuses

    external_tester_result_waiting
    external_tester_result_imported

## Safety boundary

This route is public-read-only.

It does not expose a public POST endpoint, call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.

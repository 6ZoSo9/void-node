# VOID Public Node Tester Result Import Helper <!-- VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_DOC_V1 -->

Local operator helper for importing an outside tester receipt into the public-node tester result intake folder.

## Script

    ops/mainnet0/public-node-import-tester-result.sh

## Usage

    DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-import-tester-result.sh /path/to/tester-receipt.json

## Writes

    DATA_DIR/public-node/tester-result-intake/latest.json
    DATA_DIR/public-node/tester-result-intake/archive/tester-result-<timestamp>.json

## Required receipt marker

    VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1

## Required green marker

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

## Safety boundary

This helper is operator-local only.

It does not expose a public POST endpoint, call private APIs, mutate chain state, move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat outside tester receipts as network truth.

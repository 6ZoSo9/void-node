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


## Demo 003 receipt field <!-- VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_HELPER_DOC_V1 -->

Standalone outside tester receipts may include:

       "demo003_folder_checked": true
       "demo003_folder_manifest": "<base>/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json"

The public intake route summarizes those fields under:

       demo003_receipt_intake

The import remains operator-local file import only and does not create network truth.

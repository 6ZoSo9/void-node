# VOID Public Node Tester Receipt Operator Runbook v1

Marker: VOID_PUBLIC_NODE_TESTER_RECEIPT_OPERATOR_RUNBOOK_V1

This runbook describes the safe operator flow for handling an outside tester's tester-receipt.json.

Current state before first real receipt:

- public tester lane is live
- tester receipt intake is waiting
- receipts are operator-local imports only
- no public POST endpoint is exposed
- tester receipts are external evidence, not consensus/network truth

1. Watch receipt state

Command:

ops/mainnet0/public-node-first-external-receipt-watch.sh

Expected before first real tester receipt:

receipt_state=waiting_for_external_receipt
latest_imported=False

2. Preflight a received receipt without importing

Command:

EXPECTED_BASE="http://108.232.1.111:4100" ops/mainnet0/public-node-tester-receipt-safe-import.sh /path/to/tester-receipt.json

Expected dry-run markers:

VOID_PUBLIC_NODE_TESTER_RECEIPT_PREFLIGHT_V1_GREEN
import_skipped=true
VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1_PREFLIGHT_GREEN

3. Import a real outside tester receipt

Only run this after the dry-run preflight is green.

Command:

EXPECTED_BASE="http://108.232.1.111:4100" DATA_DIR=data_a CONFIRM_IMPORT=true VERIFY_PUBLIC_ROUTE=true ops/mainnet0/public-node-tester-receipt-safe-import.sh /path/to/tester-receipt.json

Expected import marker:

VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1_GREEN

4. Verify intake after import

Command:

ops/mainnet0/public-node-first-external-receipt-watch.sh

Expected after a real imported tester receipt:

receipt_state=external_receipt_imported
latest_imported=True

Safety boundary:

The import helper normalizes the tester receipt and keeps:

trusted_as_network_truth=false
imported_by_operator=true

The receipt is useful external evidence that a public tester saw the green marker. It does not become consensus truth, does not move funds, does not trigger WC-to-VOID conversion, does not fulfill Buy VOID, and does not mutate validators.

Runtime note:

The exact public base URL is operator-runtime configuration and may change. Update EXPECTED_BASE to match /public-node/external-base-url.json before importing a real receipt.

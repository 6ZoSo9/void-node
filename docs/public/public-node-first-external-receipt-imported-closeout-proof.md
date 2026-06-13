# Public Node First External Receipt Imported Closeout Proof v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_DOC_V1`

This proof closes the first real external tester receipt loop after an outside machine generated a green standalone smoke receipt and the operator imported it locally.

The proof verifies:

- `/public-node/tester-result-intake.json` reports `external_tester_result_imported`
- `/public-node/external-tester-receipt-closeout-status.json` reports imported closeout ready
- `waiting_for_external_receipt=false`
- `latest_imported=true`
- latest tester is `standalone-outside-tester`
- latest result is `green`
- imported receipt remains external evidence only
- `trusted_as_network_truth=false`
- no public upload endpoint is enabled
- no wallet, funds, WC swap, Buy VOID, or validator mutation is enabled
- the first external receipt watch is green
- the live public-node rollup is green

Expected final marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN`

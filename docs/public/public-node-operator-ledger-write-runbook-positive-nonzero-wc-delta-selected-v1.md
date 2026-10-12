# Public Node Operator Ledger Write Runbook Positive Nonzero WC Delta Selected v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_POSITIVE_NONZERO_WC_DELTA_SELECTED_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.sh`

## Purpose

This gate proves a positive, nonzero WC delta has been selected for the future operator-controlled ledger write path.

This is still not a real WC ledger write.

## Current state

`ledger_write_runbook_positive_nonzero_wc_delta_selected_only`

`positive_nonzero_wc_delta_selected_no_live_write`

## Selected delta

`+1 WC`

## Still blocked

The following remain false:

- ledger entry preview reviewed
- final operator apply
- live runtime write
- ledger write allowed
- WC ledger write
- WC credit award
- WC ledger mutation
- WC-to-VOID swap
- wallet send
- validator mutation

## Next gate

`operator_ledger_write_runbook_ledger_entry_preview_reviewed_v1`

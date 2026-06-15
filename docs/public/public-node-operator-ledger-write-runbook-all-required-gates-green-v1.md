# Public Node Operator Ledger Write Runbook All Required Gates Green v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-all-required-gates-green-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-all-required-gates-green-v1-proof.sh`

## Purpose

This gate proves all required prewrite gates are green for the proposed WC ledger entry.

This is still not a real WC ledger write.

## Green gates

- source hash chain green
- duplicate ledger entry check green
- positive nonzero WC delta selected
- ledger entry preview reviewed
- final operator apply present

## Still blocked

The following remain false:

- ready for ledger write
- ready for credit award
- live runtime write
- ledger write allowed
- WC ledger write
- WC credit award
- WC ledger mutation
- WC-to-VOID swap
- wallet send
- validator mutation

## Next gate

`operator_ledger_write_runbook_ready_for_ledger_write_v1`

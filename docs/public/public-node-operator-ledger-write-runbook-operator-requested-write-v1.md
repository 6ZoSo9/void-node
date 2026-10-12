# Public Node Operator Ledger Write Runbook Operator Requested Write v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_OPERATOR_REQUESTED_WRITE_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-operator-requested-write-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-operator-requested-write-v1-proof.sh`

## Purpose

This gate proves the operator write request checkpoint is recorded for the future WC ledger-write runbook.

This is still not a real WC ledger write.

## Green state

- exact operator execute command packet reviewed
- exact operator execute command present now
- operator requested write reviewed
- requested now
- selected delta: 1 WC
- previewed entry kind: wc_delta

## Still blocked

The following remain false:

- ready for credit award
- live runtime write
- ledger write allowed now
- ledger record created now
- ledger entry created now
- WC ledger write
- WC ledger mutation
- WC credit award
- WC credit delta now
- WC-to-VOID swap
- wallet send
- validator mutation
- automatic ledger write allowed

## Next gate

`operator_ledger_write_runbook_live_write_unlock_v1`

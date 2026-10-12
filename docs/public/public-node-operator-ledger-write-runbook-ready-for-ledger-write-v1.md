# Public Node Operator Ledger Write Runbook Ready For Ledger Write v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_READY_FOR_LEDGER_WRITE_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-ready-for-ledger-write-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.sh`

## Purpose

This gate proves the proposed WC ledger entry is ready for a ledger-write boundary review.

This is still not a real WC ledger write.

## Green state

- all required gates green
- ready for ledger write
- selected delta: 1 WC
- previewed entry kind: wc_delta

## Still blocked

The following remain false:

- ready for credit award
- live runtime write
- ledger write allowed
- ledger record created now
- ledger entry created now
- WC ledger write
- WC ledger mutation
- WC credit award
- WC credit delta now
- WC-to-VOID swap
- wallet send
- validator mutation

## Next gate

`operator_ledger_write_runbook_ledger_write_allowed_boundary_v1`

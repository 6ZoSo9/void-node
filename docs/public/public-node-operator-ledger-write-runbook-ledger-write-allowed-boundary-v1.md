# Public Node Operator Ledger Write Runbook Ledger Write Allowed Boundary v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.sh`

## Purpose

This gate proves the operator reached and reviewed the ledger-write allowed boundary.

This is still not a real WC ledger write.

## Green state

- all required gates green
- ready for ledger write
- ledger-write boundary reviewed
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

`operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_v1`

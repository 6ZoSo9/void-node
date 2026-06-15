# Public Node Operator Ledger Write Runbook Final Apply v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_APPLY_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-final-apply-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-final-apply-v1-proof.sh`

## Purpose

This gate proves the final apply review checkpoint is recorded for the future WC ledger-write runbook.

This is still not a real WC ledger write.

## Green state

- final apply reviewed
- live write unlock reviewed
- live write unlocked for final apply
- operator requested write reviewed
- requested now
- exact operator execute command present now
- selected delta: 1 WC
- previewed entry kind: wc_delta
- final apply review passed

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

`operator_ledger_write_runbook_separate_live_mutation_v1`

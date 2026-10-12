# Public Node Operator Ledger Write Runbook Live Write Unlock v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-live-write-unlock-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-live-write-unlock-v1-proof.sh`

## Purpose

This gate proves the live write unlock checkpoint is recorded for the future WC ledger-write runbook.

This is still not a real WC ledger write.

## Green state

- operator requested write reviewed
- requested now
- exact operator execute command present now
- live write unlock reviewed
- live write unlocked for final apply
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

`operator_ledger_write_runbook_final_apply_v1`

# Public Node Operator Ledger Write Runbook Final Operator Apply Present v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-final-operator-apply-present-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-final-operator-apply-present-v1-proof.sh`

## Purpose

This gate proves the final operator apply marker is present for a proposed WC ledger entry.

This is still not a real WC ledger write.

## Apply target

- kind: `wc_delta`
- subject: `first_external_tester_operator_ledger_write_readiness_fixture`
- delta: `+1 WC`

## Still blocked

The following remain false:

- all required gates green
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

`operator_ledger_write_runbook_all_required_gates_green_v1`

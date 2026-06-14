# Public Node Operator Ledger Write Runbook Scratch Receipt v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-scratch-receipt-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-scratch-receipt-v1-proof.sh`

## Purpose

Operator Ledger Write Runbook Scratch Receipt v1 proves that a scratch ledger-write candidate can produce receipt evidence without touching live runtime state.

This is still not a real ledger write.

## Current state

`ledger_write_runbook_scratch_receipt_only`

`scratch_receipt_no_live_ledger_write`

## Safety boundary

Allowed:

- proof-local scratch candidate under a temporary directory
- proof-local scratch receipt under a temporary directory
- candidate SHA-256 recorded in the scratch receipt

Denied:

- live runtime write
- WC ledger write
- WC credit award
- positive WC credit delta
- WC-to-VOID swap
- wallet send
- validator mutation
- money movement
- public earning
- public submission
- automatic ledger write

## Next gate

`operator_ledger_write_runbook_live_refusal_guard_v1`

That next gate should be a refusal guard first, not a write path.

## Live rollup guard

The public node live status rollup must emit:

`operator_ledger_write_runbook_scratch_receipt_live_status_rollup_green=true`

This means the scratch receipt proof is present, proof-backed, tmp-only, and still performs no live WC ledger write.


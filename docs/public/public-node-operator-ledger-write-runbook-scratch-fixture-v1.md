# Public Node Operator Ledger Write Runbook Scratch Fixture v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_FIXTURE_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-scratch-fixture-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-scratch-fixture-v1-proof.sh`

## Purpose

Operator Ledger Write Runbook Scratch Fixture v1 proves that the future WC ledger write runbook can create a scratch candidate without touching live runtime state.

This is still not a real ledger write.

## Current state

`ledger_write_runbook_scratch_fixture_only`

`scratch_only_no_live_ledger_write`

## Safety boundary

Allowed:

- proof-local scratch output under a temporary directory
- read-only public route
- no live runtime mutation

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

`operator_ledger_write_runbook_scratch_receipt_v1`

That next gate should prove a receipt for the scratch candidate before any live write path exists.

## Live rollup guard

The public node live status rollup must emit:

`operator_ledger_write_runbook_scratch_fixture_live_status_rollup_green=true`

This means the scratch fixture proof is present, proof-backed, tmp-only, and still performs no live WC ledger write.


# Public Node Operator Ledger Write Runbook Separate Live Mutation v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-separate-live-mutation-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-separate-live-mutation-v1-proof.sh`

## Purpose

This gate records the separate live mutation danger boundary for the future WC ledger-write runbook.

This is still not a real WC ledger write.

## Green state

- separate live mutation boundary reviewed
- mutation path identified
- final apply reviewed
- final apply review passed
- operator requested write reviewed
- requested now
- live write unlocked for final apply
- selected delta: 1 WC

## Candidate mutation paths

- `src/http/datanet_routes.ts` WC append path
- `src/index.ts` WC ledger append helpers

## Required before any mutation

- new explicit operator command
- runtime write enable
- duplicate guard recheck
- pre-mutation backup
- post-mutation receipt

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

`operator_ledger_write_runbook_dry_mutation_plan_v1`

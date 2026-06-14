# Public Node Operator Ledger Write Runbook Design v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_DOC_V1`

Route: `/public-node/operator-ledger-write-runbook-design-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-write-runbook-design-v1-proof.sh`

## Purpose

Operator Ledger Write Runbook Design v1 defines the shape of a future manual Work Credit ledger write runbook.

This is not the runbook.

This is not executable.

This does not write to the WC ledger.

## Current state

`ledger_write_runbook_design_only`

`runbook_not_executable`

## Locked safety claims

The route must keep these values false or zero:

- `executable=false`
- `runbook_exists=false`
- `runbook_created_now=false`
- `live_runtime_write=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `work_execution_open=false`
- `operator_confirmation_present=false`
- `source_hash_chain_green=false`
- `duplicate_ledger_entry_check_green=false`
- `positive_nonzero_wc_delta_selected_by_operator=false`
- `ledger_entry_preview_reviewed=false`
- `ready_for_ledger_write=false`
- `ledger_write_allowed_now=false`
- `ledger_record_created_now=false`
- `wc_ledger_write=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_award=false`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`
- `wallet_send=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- `automatic_ledger_write_allowed=false`

## Design steps

A future real runbook must include:

1. refusal guard
2. explicit operator confirmation
3. readiness snapshot recheck
4. source hash chain verification
5. duplicate ledger entry check
6. positive nonzero delta selection
7. ledger entry preview review
8. scratch-only dry run
9. live write boundary
10. post-write receipt and rollup

## Next gate

`operator_ledger_write_runbook_scratch_fixture_v1`

That next gate should still be scratch-only. We should not open the real ledger write path until the scratch fixture proves all denial and confirmation boundaries.

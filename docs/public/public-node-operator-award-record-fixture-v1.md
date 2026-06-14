# Public Node Operator Award Record Fixture v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_DOC_V1`

Route: `/public-node/operator-award-record-fixture-v1.json`

Proof: `ops/mainnet0/public-node-operator-award-record-fixture-v1-proof.sh`

## Purpose

Operator Award Record Fixture v1 is an award-record-fixture-only model for future manual Work Credit award records.

It models the shape of a future operator award record after an operator award intent packet.

It does not create award records, awards, ledger entries, ledger records, Work Credit awards, WC-to-VOID swaps, money movement, validator mutation, public submissions, or work execution.

## Current status

`award_record_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `award_record_fixture_only=true`
- `executable=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `public_submission_open=false`
- `work_execution_open=false`
- `operator_confirmation_present=false`
- `award_record_created_now=false`
- `award_created_now=false`
- `ledger_entry_created_now=false`
- `ledger_record_created_now=false`
- `wc_review_record_write=false`
- `wc_decision_record_write=false`
- `wc_award_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `proposed_wc_delta_only=true`
- `proposed_wc_delta=0`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- `automatic_ledger_write_allowed=false`

## Required award record fields

The v1 fixture requires future operator award records to include:

- `award_record_id`
- `candidate_id`
- `operator_id`
- `source_dry_run_id`
- `source_intent_packet_id`
- `evidence_hash`
- `award_decision`
- `proposed_wc_delta`
- `operator_confirmation_present`
- `award_record_created_now`
- `ledger_entry_created_now`
- `wc_ledger_mutated_now`

## Award record rules

The v1 fixture requires:

- source intent packet required
- operator confirmation required
- proposed delta is preview-only
- award record write not allowed
- ledger write not allowed

## Denied now

These remain denied in v1:

- public mutation
- public earning
- public submission
- work execution
- award record write
- award write
- ledger entry write
- ledger record write
- WC review record write
- WC decision record write
- WC award record write
- WC ledger write
- WC credit award
- positive WC credit delta
- WC-to-VOID swap
- wallet send
- validator mutation
- money movement
- automatic ledger write

## Dependencies

Operator Award Record Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_V1`

## Next gate

`operator_ledger_entry_preview_fixture_v1`

## Safety claim

Operator Award Record Fixture v1 proves only that VOID has a public, machine-readable award record model for future manual Work Credit award review.

It does not prove public earning readiness, award readiness, ledger readiness, token distribution readiness, WC-to-VOID swap readiness, or production launch readiness.

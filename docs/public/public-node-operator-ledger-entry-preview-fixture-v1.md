# Public Node Operator Ledger Entry Preview Fixture v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_DOC_V1`

Route: `/public-node/operator-ledger-entry-preview-fixture-v1.json`

Proof: `ops/mainnet0/public-node-operator-ledger-entry-preview-fixture-v1-proof.sh`

## Purpose

Operator Ledger Entry Preview Fixture v1 is a ledger-entry-preview-only model for future manual Work Credit ledger entries.

It models the shape of a future operator-reviewed ledger entry preview after an operator award record.

It does not create ledger entry previews, ledger entries, ledger records, award records, awards, Work Credit awards, WC-to-VOID swaps, money movement, validator mutation, public submissions, or work execution.

## Current status

`ledger_entry_preview_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `ledger_entry_preview_fixture_only=true`
- `preview_only=true`
- `executable=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `public_submission_open=false`
- `work_execution_open=false`
- `operator_confirmation_present=false`
- `ledger_entry_preview_created_now=false`
- `ledger_entry_created_now=false`
- `ledger_record_created_now=false`
- `award_record_created_now=false`
- `award_created_now=false`
- `wc_review_record_write=false`
- `wc_decision_record_write=false`
- `wc_award_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `preview_wc_delta_only=true`
- `preview_wc_delta=0`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- `automatic_ledger_write_allowed=false`

## Required ledger preview fields

The v1 fixture requires future ledger entry previews to include:

- `ledger_entry_preview_id`
- `candidate_id`
- `operator_id`
- `source_dry_run_id`
- `source_intent_packet_id`
- `source_award_record_id`
- `evidence_hash`
- `ledger_delta_preview`
- `operator_confirmation_present`
- `ledger_entry_preview_created_now`
- `ledger_record_created_now`
- `wc_ledger_mutated_now`

## Ledger preview rules

The v1 fixture requires:

- source award record required
- operator confirmation required
- preview delta only
- ledger entry preview write not allowed
- ledger record write not allowed
- WC ledger write not allowed

## Denied now

These remain denied in v1:

- public mutation
- public earning
- public submission
- work execution
- ledger entry preview write
- ledger entry write
- ledger record write
- award record write
- award write
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

Operator Ledger Entry Preview Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_V1`

## Next gate

`operator_ledger_write_readiness_fixture_v1`

## Safety claim

Operator Ledger Entry Preview Fixture v1 proves only that VOID has a public, machine-readable ledger entry preview model for future manual Work Credit ledger review.

It does not prove public earning readiness, ledger write readiness, credit award readiness, token distribution readiness, WC-to-VOID swap readiness, or production launch readiness.

## Live rollup guard

Operator Ledger Entry Preview Fixture v1 is included in the public-node live status rollup when the rollup emits:

`operator_ledger_entry_preview_live_status_rollup_green=true`


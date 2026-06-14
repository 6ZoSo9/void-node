# Public Node Operator Controlled Earning Dry Run Fixture v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_DOC_V1`

Route: `/public-node/operator-controlled-earning-dry-run-fixture-v1.json`

Proof: `ops/mainnet0/public-node-operator-controlled-earning-dry-run-fixture-v1-proof.sh`

## Purpose

Operator Controlled Earning Dry Run Fixture v1 is a dry-run-only fixture for future manual Work Credit earning review.

It models candidate inspection, evidence hash verification, capability envelope checks, nonce/replay checks, resource policy checks, duplicate checks, simulated operator decisions, and simulated award-intent previews.

It does not create dry-run records, review records, decision records, award-intent packets, award records, ledger entries, Work Credit awards, WC-to-VOID swaps, money movement, validator mutation, public submissions, or work execution.

## Current status

`dry_run_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `dry_run_only=true`
- `executable=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `public_submission_open=false`
- `work_execution_open=false`
- `operator_confirmation_present=false`
- `dry_run_record_created_now=false`
- `review_record_created_now=false`
- `decision_record_created_now=false`
- `award_intent_packet_created_now=false`
- `award_record_created_now=false`
- `ledger_entry_created_now=false`
- `wc_review_record_write=false`
- `wc_decision_record_write=false`
- `wc_award_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- `automatic_ledger_write_allowed=false`

## Required dry-run fields

The v1 fixture requires future operator-controlled earning dry-run records to include:

- `dry_run_id`
- `candidate_id`
- `operator_id`
- `evidence_hash`
- `capability_envelope_id`
- `nonce_state`
- `resource_policy_id`
- `duplicate_state`
- `simulated_decision`
- `simulated_wc_delta`
- `operator_confirmation_present`
- `ledger_write_allowed`
- `award_created_now`
- `wc_ledger_mutated_now`

## Allowed dry-run steps

The v1 fixture models these future dry-run steps:

- inspect candidate
- verify evidence hash
- check capability envelope
- check nonce replay
- check resource policy
- check duplicate state
- simulate operator decision
- simulate award-intent preview

## Denied now

These remain denied in v1:

- public mutation
- public earning
- public submission
- work execution
- dry-run record write
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

Operator Controlled Earning Dry Run Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1`

## Next gate

`operator_award_intent_packet_fixture_v1`

## Safety claim

Operator Controlled Earning Dry Run Fixture v1 proves only that VOID has a public, machine-readable dry-run model for future manual Work Credit earning review.

It does not prove public earning readiness, public execution readiness, production ledger readiness, token distribution readiness, WC-to-VOID swap readiness, or production launch readiness.

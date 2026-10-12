# Public Node Operator Award Intent Packet Fixture v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_DOC_V1`

Route: `/public-node/operator-award-intent-packet-fixture-v1.json`

Proof: `ops/mainnet0/public-node-operator-award-intent-packet-fixture-v1-proof.sh`

## Purpose

Operator Award Intent Packet Fixture v1 is an intent-packet-only fixture for future manual Work Credit award review.

It models a future human-readable award intent packet after an operator-controlled earning dry run.

It does not create award intent packets, award records, ledger entries, Work Credit awards, WC-to-VOID swaps, money movement, validator mutation, public submissions, or work execution.

## Current status

`intent_packet_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `intent_packet_only=true`
- `executable=false`
- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `public_submission_open=false`
- `work_execution_open=false`
- `operator_confirmation_present=false`
- `award_intent_packet_created_now=false`
- `award_record_created_now=false`
- `ledger_entry_created_now=false`
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

## Required intent packet fields

The v1 fixture requires future operator award intent packets to include:

- `intent_packet_id`
- `candidate_id`
- `operator_id`
- `source_dry_run_id`
- `evidence_hash`
- `resource_policy_id`
- `simulated_decision`
- `proposed_wc_delta`
- `operator_confirmation_present`
- `award_record_created_now`
- `ledger_entry_created_now`
- `wc_ledger_mutated_now`

## Intent packet rules

The v1 fixture requires:

- source dry run required
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
- award intent packet write
- award record write
- ledger entry write
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

Operator Award Intent Packet Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1`
- `VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1`
- `VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1`

## Next gate

`operator_award_record_fixture_v1`

## Safety claim

Operator Award Intent Packet Fixture v1 proves only that VOID has a public, machine-readable intent packet model for future manual Work Credit award review.

It does not prove public earning readiness, award readiness, ledger readiness, token distribution readiness, WC-to-VOID swap readiness, or production launch readiness.

## Live rollup guard

Operator Award Intent Packet Fixture v1 is included in the public-node live status rollup when the rollup emits:

`operator_award_intent_packet_live_status_rollup_green=true`


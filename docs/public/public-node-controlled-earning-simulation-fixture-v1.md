# Public Node Controlled Earning Simulation Fixture v1

Marker: `VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_DOC_V1`

Route: `/public-node/controlled-earning-simulation-fixture-v1.json`

Proof: `ops/mainnet0/public-node-controlled-earning-simulation-fixture-v1-proof.sh`

## Purpose

Controlled Earning Simulation Fixture v1 is a simulation-only fixture for future Work Credit earning eligibility.

It models eligibility, rejection, operator review, duplicate protection, nonce/replay dependency, evidence hashing, and award-intent boundaries.

It does not execute public writes, create review records, create decision records, create award records, mutate the WC ledger, award WC, swap WC to VOID, move money, or unlock public earning.

## Current status

`simulation_fixture_only`

## Safety state

The public route must keep these values false or zero:

- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `public_submission_open=false`
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

## Required simulation record fields

The v1 fixture requires future earning simulation records to include:

- `simulation_id`
- `evidence_id`
- `worker_subject`
- `capability`
- `nonce_state`
- `evidence_hash`
- `utility_score`
- `verifiability_score`
- `abuse_risk_score`
- `duplicate_state`
- `operator_review_state`
- `simulated_decision`
- `simulated_wc_delta`
- `ledger_write_allowed`
- `award_created_now`
- `wc_ledger_mutated_now`

## Allowed simulated decisions

The v1 fixture defines these simulated decisions:

- `eligible_pending_operator_review`
- `rejected_replay`
- `rejected_expired`
- `rejected_duplicate`
- `rejected_low_utility`
- `rejected_suspicious_payload`
- `approved_simulation_only_no_award`

## Required future protections

Any future executable earning lane must require:

- Runtime Gate Lock green
- Capability Envelope green
- Nonce Replay Protection green
- source hash evidence
- duplicate check
- operator review
- explicit future ledger-write confirmation
- positive WC delta selected by an operator
- ledger write proof
- fail-closed public mutation boundary

## Denied now

These remain denied in v1:

- public mutation
- public earning
- WC review record write
- WC decision record write
- WC award record write
- WC ledger write
- WC credit award
- positive WC credit delta
- WC-to-VOID swap
- validator mutation
- money movement
- automatic ledger write

## Dependencies

Controlled Earning Simulation Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`
- `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1`

## Next gate

`resource_isolation_policy_fixture_v1`

## Safety claim

Controlled Earning Simulation Fixture v1 proves only that VOID has a public, machine-readable simulation model for future Work Credit eligibility.

It does not prove public earning readiness, public write readiness, production ledger readiness, token distribution readiness, WC-to-VOID swap readiness, or production launch readiness.

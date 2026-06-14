# Public Node Nonce Replay Protection Fixture v1

Marker: `VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_DOC_V1`

Route: `/public-node/nonce-replay-protection-fixture-v1.json`

Proof: `ops/mainnet0/public-node-nonce-replay-protection-fixture-v1-proof.sh`

## Purpose

Nonce Replay Protection Fixture v1 is a design-only fixture for future signed capability envelope replay protection.

It defines nonce records, envelope IDs, expiry requirements, body-hash binding, issuer binding, audience binding, scope binding, replay rejection states, and single-use rules.

It does not execute public writes, award Work Credits, mutate validator state, move VOID, or unlock public earning.

## Current status

`design_fixture_only`

## Safety state

The public route must keep these values false:

- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `wc_credit_award_open=false`
- `wc_to_void_swap_open=false`
- `validator_mutation_open=false`
- `money_movement_open=false`

## Required nonce record fields

The v1 fixture requires future nonce replay records to include:

- `nonce_id`
- `envelope_id`
- `capability`
- `issuer`
- `subject`
- `audience`
- `scope_hash`
- `body_sha256`
- `issued_at`
- `expires_at`
- `first_seen_at`
- `consumed_at`
- `state`
- `replay_count`
- `decision`

## Required future protections

Any future executable capability envelope must be protected by:

- single-use nonce enforcement
- replay rejection
- expiry rejection
- body hash binding
- issuer binding
- audience binding
- scope binding

## Allowed states

The v1 fixture defines these allowed states:

- `fresh_unseen`
- `accepted_once_future`
- `replayed_rejected`
- `expired_rejected`
- `scope_mismatch_rejected`
- `body_hash_mismatch_rejected`
- `issuer_mismatch_rejected`
- `audience_mismatch_rejected`

## Denied now

These remain denied in v1:

- public mutation
- WC credit award
- WC-to-VOID swap
- validator mutation
- money movement
- admin operation
- automatic ledger write

## Dependencies

Nonce Replay Protection Fixture v1 depends on:

- `VOID_RUNTIME_GATE_LOCK_V1`
- `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1`

Both must remain green before any future executable capability implementation can be considered.

## Next gate

`controlled_earning_simulation_fixture_v1`

## Safety claim

Nonce Replay Protection Fixture v1 proves only that VOID has a public, machine-readable design fixture for future nonce and replay protection.

It does not prove production cryptographic replay enforcement, public earning readiness, public write readiness, or production launch readiness.

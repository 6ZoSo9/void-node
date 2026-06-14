# Public Node Capability Envelope v1

Marker: `VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_DOC_V1`

Route: `/public-node/capability-envelope-v1.json`

Proof: `ops/mainnet0/public-node-capability-envelope-v1-proof.sh`

## Purpose

Capability Envelope v1 is a design-only fixture for the future signed request format used by guarded VOID public-node actions.

It defines the shape of a future capability-bearing envelope without granting authority, executing mutation, awarding Work Credits, moving VOID, registering validators, or opening public writes.

## Current status

`design_fixture_only`

## Safety state

Capability Envelope v1 is intentionally non-executable.

The public route must keep these values false:

- `mutation_unlocked=false`
- `public_mutation_open=false`
- `public_earning_open=false`
- `wc_credit_award_open=false`
- `wc_to_void_swap_open=false`
- `validator_mutation_open=false`
- `money_movement_open=false`

## Required future envelope fields

The v1 fixture requires the future envelope shape to include:

- `version`
- `chain_id`
- `capability`
- `subject`
- `issuer`
- `audience`
- `scope`
- `nonce`
- `issued_at`
- `expires_at`
- `body_sha256`
- `signature`

## Required future protections

Any future executable capability envelope must include:

- nonce protection
- replay protection
- expiration
- body hash binding
- signature verification
- scoped authority
- audience binding

## Denied now

These remain denied in v1:

- public mutation
- WC credit award
- WC-to-VOID swap
- validator mutation
- money movement
- admin operation

## Dependency

Capability Envelope v1 depends on Runtime Gate Lock v1.

Runtime Gate Lock v1 must remain green before any future capability implementation can be considered.

## Next gate

`nonce_replay_protection_fixture_v1`

## Safety claim

Capability Envelope v1 proves only that VOID has a public, machine-readable design fixture for a future signed request envelope.

It does not prove cryptographic identity, replay protection, signature validation, public earning readiness, public write readiness, or production launch readiness.

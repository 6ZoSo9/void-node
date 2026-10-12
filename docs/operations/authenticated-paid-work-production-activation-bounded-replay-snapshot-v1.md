# Authenticated paid-work production activation bounded replay snapshot v1

This lane defines the reviewed **fresh-store zero-state** replay snapshot required before authenticated paid-work production activation.

Artifact: `ops/mainnet0/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.json`

Artifact SHA-256: `4bd9c20409b961297554a5d830c4a6c3b7c9b24b000766c58c5bd30fb1959f33`

## Exact snapshot

The acceptance replay state and payment-authority replay state are both revision `0`, contain no consumed identifiers, contain no active mappings, and use their canonical state IDs:

- acceptance: `voidawrs1_09fcfb20aa71c21c83beddec7ca3965d2bcd98d13c08d9f0e70842e0f255d678`
- payment authority: `voidawpars1_097a5fbf4f39114585363c8152bd2d4666a914cc54358b7008de73ba97037837`

The combined canonical snapshot is `775` bytes and is capped at `2048` bytes.

## Fresh-store boundary

This snapshot is valid only for a newly materialized, owner-private empty activation root at:

`/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/activation`

The separate activation-execution lane must first reobserve that the root is absent. The confirmed execution operation may create only that root as owner `zoso`, mode `0700`, canonical and empty. At runtime entry there must be no `current.json`, generation, staging entry, lock, temporary pointer, or unknown entry.

A pre-existing root requires separate reconciliation. Any current pointer, nonzero generation count, nonzero revision, consumed identifier, active mapping, or state-ID mismatch rejects this snapshot.

## Runtime binding

The runtime command does not supply replay-state fields directly. `inspectAuthenticatedPaidWorkActivationPersistenceStoreV1` derives the store state, and the runtime binding injects the selected acceptance and payment snapshots plus their expected revisions into the persistence engine.

The first commit requires zero revisions and empty replay state, then atomically consumes five identities. Every later transition uses compare-and-swap against persisted parent state. Resetting a committed store to the zero snapshot is forbidden.

## Remaining blockers

1. `activation_execution_confirmation`
2. `live_canary_scope`

Readiness remains **HOLD**.

## Authority boundary

This source lane does not inspect production persistence state, create the persistence root, materialize a replay snapshot, write a generation or pointer, accept a quote, authorize or execute payment, dispatch work, write Work Credits, access a wallet or signer, install or operate a service, deploy, activate, read credentials or tokens, or move funds.

## Credential-reference reconciliation

This source lane is recomposed on current `main` `58dd94a3f2718334d509422400c286ce1a0b6793` and binds the merged non-secret `credential_reference_metadata` by tracked path, source commit, Git blob SHA-1, and SHA-256.

After publication, the remaining blockers are `activation_execution_confirmation` and `live_canary_scope`. Readiness remains **HOLD**. This lane performs no credential or token read, activation, service start, payment execution, work dispatch, Work Credit write, wallet access, signing, settlement, transaction broadcast, or fund movement.

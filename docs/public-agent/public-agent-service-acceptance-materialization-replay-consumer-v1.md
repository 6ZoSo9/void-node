# VOID Public Agent Service Acceptance Materialization Replay Consumer V1

Marker:
`VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1`

Source evidence:

- pack SHA-256: `4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec`
- source commit: `182228a1a9c4b31ec5ce9dc4b0fa1383938913df`
- sealed requester-authentication checkpoint: `ckpt-public-agent-service-requester-acceptance-authentication-v1-pr797-post-merge-exact-green-182228a1a9c4`

## Evidence correction

The source-evidence pack confirms the canonical
`materializeAgentPaidWorkAcceptance` implementation and all required replay
invariants.

It does **not** contain an acceptance-specific persistent replay consumer. The
diagnostic's consumer and atomic signals came from declarative requirements,
schemas, proofs, and unrelated atomic persistence patterns.

This lane therefore does not invent a second persistent authority model. It
defines a pure atomic transition over an explicit replay-state snapshot. A
future persistence adapter may apply that exact transition only after separate
review.

Diagnostic correction:

`acceptance_specific_persistent_replay_consumer_not_found`

## Purpose

The consumer binds:

1. a verified requester acceptance-authentication packet;
2. the canonical paid-work work-order and quote envelopes;
3. the canonical acceptance materializer;
4. one explicit replay-state snapshot;
5. one expected compare-and-swap revision.

For external requester evidence, it produces an in-memory acceptance envelope
and an all-or-nothing next-state plan.

For the checked-in fixture, it produces only a deterministic acceptance preview
and no state transition.

## Atomic consumption contract

The external transition consumes exactly three identities together:

- requester authentication ID;
- provider authentication ID;
- acceptance ID.

The transition also records one active acceptance for the quote.

Any replay, active-quote conflict, or revision mismatch rejects the entire
operation. The supplied state object remains unchanged. There is no partial
consumption result.

## Single-active acceptance rule

`active_acceptance_by_quote[quote_id]` must be absent before the transition.

A quote with any active acceptance is rejected, including a different
acceptance ID.

## Persistence boundary

Production persistence is disabled.

The adapter:

- does not write a replay store;
- does not write an acceptance envelope;
- does not rename or replace state files;
- does not open a database transaction;
- does not expose an HTTP mutation route;
- does not mutate the running node.

`production_persistence_consumer_verified=false`

The returned next state is a deterministic plan, not canonical runtime state.

## Acceptance boundary

The external proof may report:

- `acceptance_materialized_in_memory=true`;
- a deterministic `acceptance_id`;
- a next replay-state snapshot;
- a three-ID transaction receipt.

It always reports:

- `acceptance_created_in_durable_state=false`;
- `quote_acceptance=false`;
- no payment authority;
- no execution authority;
- no dispatch authority.

## Replay-state fields

The state snapshot contains:

- revision;
- consumed requester-authentication IDs;
- consumed provider-authentication IDs;
- consumed acceptance IDs;
- active acceptance by quote;
- deterministic state ID.

All ID arrays and quote keys are sorted and unique.

## Verification

```bash
npx tsx   scripts/prove_public_agent_service_acceptance_materialization_replay_consumer_v1.ts
```

The proof covers:

- exact source-evidence provenance;
- dynamic discovery of the existing pure public-agent work-order adapter;
- canonical work-order, quote, requester-authentication, and acceptance
  validation;
- deterministic fixture preview;
- complete ephemeral external provider and requester authentication;
- in-memory acceptance materialization;
- atomic three-ID consumption;
- one active acceptance per quote;
- requester, provider, and acceptance replay;
- active-quote conflict;
- stale revision;
- no partial state mutation after rejection;
- no persistence, network, signing, payment, execution, dispatch, Work Credit,
  service, or runtime authority.

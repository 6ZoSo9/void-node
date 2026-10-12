# Public Agent Service Trusted Requester Acceptance Replay Plan Verification V1

## Purpose

This contract composes:

1. one provenance-verified trusted requester packet;
2. the existing pure acceptance materialization and replay-consumer plan;
3. the canonical work-order, quote, and acceptance materializer; and
4. the persistence adapter's exported read-only packet validator.

The composition requires the replay consumer to use the exact requester
authentication input already bound to the trusted provider chain and signed
requester registry. It then verifies that the plan carries the same requester
authentication ID, provider authentication ID, handoff, quote, work order,
requester, provider, and acceptance nonce.

## Live result

For external evidence, the packet may report:

```text
trusted_requester_acceptance_replay_plan_verified
requester_binding_provenance_verified=true
acceptance_replay_plan_verified=true
acceptance_materialized_in_memory=true
atomic_three_id_transition_verified=true
single_active_acceptance_per_quote_verified=true
persistence_handoff_packet_validated=true
eligible_for_operator_confirmed_persistence=true
```

The plan includes one canonical in-memory acceptance, one next replay-state
snapshot, and one atomic three-ID transition covering the requester
authentication ID, provider authentication ID, and acceptance ID.

The transaction fields describe the transition that would be committed by a
separate persistence call. The boundary is explicit: planned consumption is not
durable consumption.

## Example result

The committed fixture remains example-only:

```text
example_only
acceptance_replay_plan_verified=false
persistence_handoff_packet_validated=false
eligible_for_operator_confirmed_persistence=false
```

It produces no next replay state, no replay transaction, and no in-memory live
acceptance.

## Replay checks

The external composition verifies:

- the requester authentication input is canonically identical across the
  provenance packet and replay input;
- requester and provider authentication IDs match;
- handoff, quote, and work-order IDs match;
- requester and provider identities match;
- the acceptance nonce matches;
- the canonical acceptance is materialized in memory;
- requester, provider, and acceptance replay checks are present;
- the expected replay-state revision is checked;
- exactly one atomic three-ID transition is planned;
- one active acceptance per quote is enforced; and
- the transition is all-or-nothing.

Any mismatched requester authentication input, stale expected revision,
tampered packet, or fixture evidence presented as live evidence is rejected.

## Read-only persistence handoff validation

The existing acceptance persistence adapter exposes a packet validator and a
separate persistence function. This composition calls only the read-only
persistence handoff validation function.

The validator proves that the replay packet has the exact structure accepted by
the persistence adapter. It checks the canonical acceptance, before and next
replay states, transaction and plan IDs, three-ID transition, active-quote
rule, revision advance, source evidence, and upstream no-persistence boundary.

This adapter does not call the persistence function. It does not construct a
persistence request, does not supply persistence confirmation, does not choose
an allowed persistence root, and does not access the filesystem through the
persistence adapter.

A later operator-confirmed call remains required before any acceptance or replay
state can become durable.

## Persistence and acceptance boundary

This contract always reports:

```text
production_persistence_consumer_invoked=false
production_persistence_performed=false
durable_acceptance_created=false
requester_authentication_replay_write_performed=false
provider_authentication_replay_write_performed=false
acceptance_replay_write_performed=false
authentication_id_consumption_performed=false
acceptance_id_consumption_performed=false
quote_acceptance_recorded=false
```

The in-memory acceptance and next replay state are evidence of a valid plan.
They are not canonical persisted state.

This adapter does not accept a quote. It records no durable acceptance, performs
no replay write, and consumes no identifier in durable state.

## Authority boundary

This adapter has no payment authority, no work dispatch authority, and no Work
Credit authority.

It grants no authority for acceptance persistence; quote acceptance; requester,
provider, or acceptance replay writes; authentication or acceptance ID
consumption; acceptance creation; payment authorization or execution; execution
authorization; work dispatch; credential or key-registry changes; provider
selection; wallet or signer access; production signing; transaction broadcast;
Work Credit writes or settlement; HTTP mutation; deployment; service restart;
runtime mutation; or money movement.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_V1_EXACT_GREEN
```

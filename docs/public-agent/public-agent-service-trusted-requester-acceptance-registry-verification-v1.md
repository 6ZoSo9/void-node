# Public Agent Service Trusted Requester Acceptance Registry Verification V1

## Purpose

This contract composes three already verified evidence chains:

1. the exact trusted provider quote-response chain;
2. the requester-signed acceptance intent; and
3. an operator-signed requester trust-registry snapshot verified against a
   pinned expected requester trust-root ID.

It resolves the requester from the signed registry at the requester
authentication timestamp and requires the resolved registry binding to be the
exact requester binding used for requester signature verification.

## Live result

For external evidence, the packet may report:

```text
trusted_requester_acceptance_registry_verified
requester_binding_provenance_verified=true
eligible_for_acceptance_materialization=true
```

This means the trusted provider chain, requester signature, requester intent,
and requester binding provenance have been composed into one verification
packet.

Eligibility is permission to proceed to the separate acceptance
materialization and replay-consumer contract. It is not quote acceptance and
does not create durable state.

## Example result

The committed example uses fixture-only requester registry and requester
evidence. It therefore reports:

```text
example_only
requester_binding_provenance_verified=false
eligible_for_acceptance_materialization=false
```

Fixture trust cannot become live trust.

## Registry checks

The verifier requires:

- the separately supplied pinned expected requester trust-root ID;
- a valid requester registry signature and deterministic snapshot IDs;
- one exact requester binding for the requester agent;
- a registry snapshot active at the requester authentication timestamp;
- the same requester agent ID, binding ID, key ID, public key, validity window,
  revocation value, and binding nonce as the binding used for requester
  signature verification; and
- the existing trusted requester packet to remain provenance-blocked before
  this composition is applied.

## Replay and persistence boundary

This adapter deliberately does not invoke the acceptance replay consumer.

It always reports:

```text
acceptance_replay_consumer_verified=false
production_persistence_consumer_verified=false
```

A later replay-consumer planner must still check and plan:

- requester authentication replay protection;
- provider authentication replay protection;
- acceptance replay protection;
- requester authentication ID consumption;
- provider authentication ID consumption;
- acceptance ID consumption;
- one active acceptance per quote; and
- expected replay-state revision.

This adapter does not consume authentication IDs, does not consume acceptance
IDs, and performs no replay write.

## Acceptance boundary

`eligible_for_acceptance_materialization=true` does not accept a quote.

The adapter does not create an acceptance, persist an acceptance envelope,
write a replay store, or claim a production persistence consumer. The existing
replay-consumer contract remains an in-memory all-or-nothing transition plan
until a separately reviewed persistence adapter exists.

## Authority boundary

This adapter has no payment authority, no work dispatch authority, and no Work
Credit authority.

It grants no authority for requester trust-root creation, rotation, or
revocation; requester binding approval, creation, rotation, revocation, or
registry writes; authentication or acceptance replay writes; identifier
consumption; acceptance creation; quote acceptance; provider selection; quote
publication; payment-rail or payment-destination resolution; payment
authorization or execution; work execution authorization; Work Credit writes
or settlement; wallet or signer access; production signing; transaction
broadcast; HTTP mutation; credential changes; deployment; service restart;
runtime mutation; or money movement.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_registry_verification_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_V1_EXACT_GREEN
```

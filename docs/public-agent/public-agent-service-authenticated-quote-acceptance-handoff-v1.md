# VOID Public Agent Service Authenticated Quote Acceptance Handoff V1

Marker:
`VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_V1`

## Purpose

This lane connects a cryptographically authenticated provider quote-response to
the next requester-side acceptance stage without creating an acceptance.

It verifies the complete provider-authentication packet, binds the requester
from the original work order, defines a dedicated requester acceptance scope,
and publishes the replay and single-active requirements that a later acceptance
consumer must enforce.

## Status transitions

The checked-in fixture produces:

- `status=example_only`
- `provider_authentication_verified=true`
- `eligible_for_requester_authentication=false`
- `requester_authentication_verified=false`
- `acceptance_created=false`

An externally sourced provider-authentication packet may produce:

- `status=requester_authentication_required`
- `provider_authentication_verified=true`
- `eligible_for_requester_authentication=true`
- `requester_authentication_verified=false`
- `acceptance_created=false`

This is readiness for requester authentication only. It is not quote acceptance.

## Requester authentication boundary

The requester acceptance scope is:

`agent_paid_work_accept`

The existing paid-work requester credential supports exactly
`agent_paid_work_submit`. This handoff explicitly sets
`submit_credential_reuse_forbidden=true`.

A later lane must define and verify requester authentication for the dedicated
acceptance scope. This lane neither issues nor changes a credential.

## Acceptance boundary

This lane does not materialize an acceptance envelope.

It emits:

- `acceptance_materialization_allowed=false`
- `acceptance_id=null`
- `requester_authentication_required=true`
- `requester_authentication_verified=false`
- `quote_acceptance=false`

The existing acceptance-envelope contract remains the canonical content and
binding contract after requester authentication and replay controls exist.

## Replay boundary

The provider-authentication packet already requires:

- authentication replay protection;
- authentication-ID consumption;
- one active acceptance per quote.

The acceptance envelope requires:

- acceptance replay protection;
- acceptance-ID consumption by a downstream consumer;
- one active acceptance per quote.

This handoff preserves all of those requirements but does not claim that an
acceptance-specific replay consumer exists. It emits:

- `authentication_replay_write=false`
- `acceptance_replay_write=false`
- `acceptance_replay_consumer_verified=false`

A later consumer must atomically consume the provider `authentication_id` and
the created `acceptance_id`, reject conflicting replays, and enforce the
single-active rule.

## Deterministic handoff ID

`handoff_id` is:

```text
voidawah1_ + sha256(canonical_json(packet_without_handoff_id))
```

Changing the provider authentication, requester identity, nonce, time window,
gate state, or authority boundary changes the ID.

## Authority boundary

This lane does not:

- create or accept an acceptance;
- write replay or consumption state;
- issue or change credentials;
- select a provider;
- create or mutate provider key bindings;
- authorize or execute payment;
- authorize or dispatch work;
- access a wallet or production signer;
- broadcast a transaction;
- submit HTTP;
- write Work Credits;
- mutate runtime;
- move money.

The proof uses an ephemeral Ed25519 provider key only to demonstrate the
external provider-evidence path. No production key is included.

## CLI

Materialize:

```bash
npx tsx \
  scripts/public_agent_service_authenticated_quote_acceptance_handoff_v1.ts \
  materialize \
  examples/public-agent-service-authenticated-quote-acceptance-handoff-v1.example.json \
  /tmp/authenticated-quote-acceptance-handoff-v1.json
```

Verify:

```bash
npx tsx \
  scripts/public_agent_service_authenticated_quote_acceptance_handoff_v1.ts \
  verify \
  examples/public-agent-service-authenticated-quote-acceptance-handoff-v1.example.json \
  /tmp/authenticated-quote-acceptance-handoff-v1.json
```

## Verification

```bash
npx tsx \
  scripts/prove_public_agent_service_authenticated_quote_acceptance_handoff_v1.ts
```

The proof covers deterministic identity, key-order stability, requester
binding, acceptance nonce sensitivity, dedicated-scope enforcement, rejection
of pre-verified requester claims, time-window binding, packet tampering, the
fixture block, and the external authenticated-provider transition to requester
authentication without acceptance creation.

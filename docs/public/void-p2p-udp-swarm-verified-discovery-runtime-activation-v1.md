# VOID P2P UDP swarm verified discovery runtime activation v1

Status: source and deterministic proof only. No public introduction collector,
launcher activation, deployment, or service restart is included.

## Problem closed

The verified discovery composition is intentionally post-authentication: relay
introductions count only when their signing identities match normally
authenticated VOID peers. The relay orchestrator previously accepted routes
only in immutable startup configuration. That timing mismatch left no safe way
to use a verified result without either trusting identities before
authentication or restarting with manually copied node IDs.

This lane adds a bounded runtime transition:

1. the caller completes normal peer authentication;
2. the caller runs the verified discovery composition;
3. the runtime mount accepts the direct frozen composition result;
4. every field, count, route, authority exclusion, and expiry is revalidated;
5. the orchestrator swaps the complete route state in one synchronous
   reference assignment;
6. expiry or an explicit clear restores the original static field-test routes.

## Closed activation contract

`activateVerifiedDiscoveryCompositionV1` accepts only the exact result emitted
by `composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1`. The result must be
deep-frozen and retain:

- canonical release-record, manifest, and discovery content IDs;
- exact orchestration enablement and two through eight parsed routes;
- at least two authenticated sources, two relays, and two relay failure
  domains;
- verified N-1 relay coverage;
- unchanged zero-authority flags;
- a canonical unexpired `expires_at` no more than ten minutes ahead.

Malformed, duplicate, self/local, over-bound, expired, mutable, authority-
widened, or internally inconsistent results fail before route-state mutation.
The in-process method is not a network endpoint and does not accept arbitrary
JSON from HTTP callers.

## Atomic and lease behavior

The orchestrator validates and canonicalizes the entire candidate set before
constructing a replacement state. The state holds the routes and their retry
bookkeeping together, so the event loop observes either the old set or the new
set, never a partially applied mixture.

Retry state is retained for unchanged routes. Removed routes are absent from the
new state, so reintroducing one starts with fresh bounded retry state. A rejected
candidate leaves the existing revision untouched.

The mount schedules an expiry clear from the verified `expires_at`. A fresh
verified result may refresh the lease. Clearing does not mutate environment
variables: it restores the canonical static startup routes when configured, or
an empty disabled route set otherwise.

## Privacy and authority

The public status exposes only whether verified discovery is active, whether an
expiry lease is required, route source/count/revision, and aggregate counters.
It does not expose relay IDs, target IDs, discovery IDs, stream IDs, IP
addresses, keys, or signatures.

This lane grants no deployment, service, router/firewall/DNS, credential,
wallet/signer, validator, Work Credit, transaction, broadcast, treasury, or
funds authority. Relay retirement remains outside this lane.

## Proof

Run:

```bash
node --import tsx scripts/prove_void_p2p_udp_swarm_verified_discovery_runtime_activation_v1.ts
```

The proof mounts a real loopback UDP socket around a bounded fake Node surface,
activates a valid two-relay result, proves rejected updates preserve the prior
revision, proves local and duplicate rejection, clears back to the static
fallback, and observes automatic expiry restoration. A separate orchestrator
sequence proves removed retry state is cleared while unchanged-route retry
state is retained.

The green marker is:

```text
VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_RUNTIME_ACTIVATION_V1_PROOF
```

## Remaining #1005 gates

The next source lane is the public relay-introduction transport/collector. It
must obtain candidates without manual addresses, bind observations to normal
peer authentication, and invoke the existing verified composition and runtime
activation seams. Issue #1005 remains open through separately authorized fresh
outside-network N-1 deployment and acceptance.

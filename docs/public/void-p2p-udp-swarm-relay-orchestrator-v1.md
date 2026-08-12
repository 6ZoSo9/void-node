# VOID P2P UDP swarm relay orchestrator v1

Status: source-only, exact opt-in, bounded field-test topology.

## Purpose

The runtime mount previously exposed the authenticated relay and UDP swarm
primitives but never called them in production. A healthy mounted UDP socket
therefore remained inert unless a proof script manually performed all three
steps.

This orchestrator is the first production caller for the existing sequence:

1. request a bounded relay reservation;
2. request an exact target connection only after the reservation is active;
3. initiate the authenticated UDP swarm upgrade only after the exact outgoing
   relay stream has started.

The incoming relay endpoint never races the outgoing endpoint by initiating a
second upgrade. Pending and active exact-stream upgrades suppress duplicates.
Accepted local requests and rejected upgrades retry only after a bounded
backoff. An attempt that could not be sent before relay authentication retries
on the next one-second sweep. Relay retirement is outside this lane.

## Exact field-test configuration

The controller is disabled by default. It requires both:

```text
VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=1
VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES=<relay-node-id>/<target-node-id>[,...]
```

Each identifier is exactly 32 lowercase hexadecimal characters. Duplicate,
self-referential, malformed, or more than eight routes fail closed. Enabling
orchestration also requires `VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1`.

The read-only runtime status reports only enablement, route count, and bounded
counters. It does not expose relay IDs, target IDs, stream IDs, observed
endpoints, or key material.

## Public onboarding boundary

This exact environment contract is a field-test injection seam, not the final
zero-configuration onboarding mechanism and not closure of issue #1005.
Ordinary users must not be required to copy operator addresses or node IDs.

Before #1005 can close, independently verifiable multipath bootstrap records
must supply multiple eligible relay/target introductions to this controller,
and outside-network N-1 acceptance must prove continued onboarding when any
one bootstrap component disappears. The current controller deliberately does
not invent identities, scrape an unauthenticated directory, select a single
required relay, or grant a transport endpoint network authority.

## Authority boundary

This source lane performs no deployment, service restart, router/firewall/DNS
mutation, port forwarding, UPnP, NAT-PMP, credential access, wallet/signer,
validator, Work Credit, transaction, broadcast, treasury, or funds action.

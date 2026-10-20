# VOID P2P UDP swarm relay orchestrator v1

Status: source-only, exact opt-in, bounded static and verified-discovery
topology.

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
Accepted local requests, rejected upgrades, and **thrown/uncertain emission
outcomes** use the 15-second bounded backoff. The reservation and connect
adapters return `undefined` when no request was dispatched; only that
explicit nonthrowing no-request outcome retains the next one-second sweep
retry. A generic exception does not prove a request was unsent, even if the
exception happens before emission in a particular fixture. This avoids
amplifying duplicate requests while preserving a fast no-send retry.
A route-local adapter exception increments the failure counter but does not
prevent later independent routes from advancing in the same sweep. A synchronous stop or verified-discovery route replacement
invalidates the current sweep before any further outbound adapter request.
The scheduler installs its single timer handle before the immediate first sweep:
synchronous route replacement during start cannot recursively create a nested
initial sweep or an orphan interval. Relay retirement is outside this lane.

## Exact field-test configuration

The controller is disabled by default. It requires both:

```text
VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=1
VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES=<relay-node-id>/<target-node-id>[,...]
```

Each identifier is exactly 32 lowercase hexadecimal characters. Duplicate,
self-referential, malformed, or more than eight routes fail closed. Enabling
orchestration also requires `VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1`.

The static environment routes remain the field-test fallback. The runtime mount
may replace them only with a closed, frozen verified-discovery composition
result. Route validation completes before a single state-reference swap; an
invalid replacement preserves the prior route set. Routes removed from the new
set lose their retry state, unchanged routes retain it, and clearing or expiry
restores the original static routes.

The read-only runtime status reports only enablement, route count, route source,
revision, and bounded counters. It does not expose relay IDs, target IDs, stream
IDs, discovery IDs, observed endpoints, or key material.

## Public onboarding boundary

This exact environment contract is a field-test injection seam, not the final
zero-configuration onboarding mechanism and not closure of issue #1005.
Ordinary users must not be required to copy operator addresses or node IDs.

Before #1005 can close, a public transport must collect independently signed
relay/target introductions after normal peer authentication and feed their
verified composition to this controller. Outside-network N-1 acceptance must
then prove continued onboarding when any one bootstrap component disappears.
The current controller deliberately does not invent identities, scrape an
unauthenticated directory, select a single required relay, or grant a transport
endpoint network authority.

## Authority boundary

This source lane performs no deployment, service restart, router/firewall/DNS
mutation, port forwarding, UPnP, NAT-PMP, credential access, wallet/signer,
validator, Work Credit, transaction, broadcast, treasury, or funds action.

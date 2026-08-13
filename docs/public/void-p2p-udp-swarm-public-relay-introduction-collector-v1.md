# VOID P2P UDP swarm public relay-introduction collector v1

Status: source contract and deterministic proof only. The collector is not
auto-started, and this lane performs no launcher mutation, deployment, observer
publication, release-root publication, or service restart.

## Outcome

This lane closes the source-level path from normally authenticated VOID peer
transports through the signed-observer authorization boundary and into the
existing verified-discovery runtime-activation seam. A mounted UDP swarm runtime
can start the collector only with an explicit observer-authorization envelope,
an explicit release root, and the existing bounded bootstrap-record and manifest
fetch callbacks. The collector then:

1. snapshots normally authenticated peers from the live `Node`;
2. rechecks every authenticated Ed25519 public key against its derived node ID;
3. derives one HTTP endpoint from each peer's authenticated, globally routable
   numeric P2P listen address;
4. fetches the fixed well-known introduction path from independent peers;
5. requires at least two peers to return the exact same canonical envelope;
6. passes the matched envelope, the live authenticated source identities, the
   reviewed signed observer authorization, and the active release root to
   `composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1`;
7. allows that wrapper to intersect the signed observer set with the live
   authenticated source set before verified discovery can run; and
8. passes only a successful frozen composition to the existing bounded runtime
   activation method.

No operator-supplied peer IDs or relay-introduction URLs are accepted by the
collector.

## Transport and peer-authentication boundary

The transport path is fixed at:

```text
/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json
```

Only peers with a completed normal VOID handshake, a canonical authenticated
Ed25519 public key, a matching derived node ID, a recognized direct or relay
transport, and a valid listen list enter the snapshot. A public HTTP candidate
is derived only from a globally routable numeric P2P address in the existing
4700-4799 mapping. Private, loopback, unspecified, link-local, multicast,
documentation, and nonnumeric addresses do not become transport candidates.

At least two distinct authenticated peers must provide public candidates. The
default fetch uses GET, requires status 200 and `application/json`, rejects
redirects, times out after five seconds, and limits each response to 256 KiB.
The collector considers only the exact four-key v1 envelope and requires at
least three locator mirrors plus a canonical discovery content ID.

Transport agreement is replaceability, not topology authority. Two independent
peers must return byte-semantically identical canonical JSON before the payload
can reach composition, but agreement alone never admits those peers as topology
observers. Split, malformed, unavailable, or single-source results hold the
current route state.

## Signed observer authority boundary

Normal VOID peer authentication proves possession of the peer identity key. It
does not authorize that peer to contribute network-topology evidence.

The collector therefore requires `observerAuthorization` and resolves its
default composition dependency only to:

`composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1`

That wrapper is the signed-observer boundary merged before this collector. It:

- validates a current threshold-signed observer authorization against the active
  bootstrap release root;
- binds every authorized observer to an exact node ID and canonical Ed25519
  public key;
- intersects the signed observer set with the collector's live normally
  authenticated source set;
- requires at least two live authorized observers before downstream bootstrap
  record or manifest fetches;
- requires discovery creation and relay observations to fall inside the signed
  authorization window; and
- prevents the resulting discovery lease from outliving observer authority.

Authenticated peers that are not in the signed observer authorization may still
act as replaceable HTTP transports. They are ignored for topology-source quorum
and cannot make a public collector authoritative by creating additional peer
identities.

After the observer gate succeeds, the existing verified-discovery composition
still independently enforces the threshold-signed release root,
content-addressed record and manifest, signed per-route observation quorum,
relay and target constraints, independent relay failure domains, N-1 coverage,
freshness, route limits, and the exact zero-authority result.

Only that frozen result reaches `activateVerifiedDiscoveryCompositionV1`.
Runtime activation revalidates its schema, identities, counts, routes, authority
exclusions, and bounded lease before atomically replacing verified routes.
Composition or activation failure is a hold, never partial route application.

## Lifecycle, privacy, and limits

The collector is mounted through `startPublicRelayIntroductionCollectorV1`. It
runs once before its bounded interval begins, prevents overlapping runs, and is
stopped with the UDP swarm runtime mount. It is deliberately not auto-started by
the launcher because a reviewed active release root, a reviewed signed observer
set, and production fetch dependencies are separate authority and deployment
gates.

Status exposes only lifecycle booleans, aggregate counts, rejection counters,
and authority flags. It does not expose peer IDs, public keys, transport
endpoints, discovery IDs, signatures, observer identities, or signed payloads.

The authority contract records:

- `signed_observer_authorization_required_by_composition: true`;
- `unauthorized_authenticated_peers_are_topology_authority: false`; and
- `transport_response_is_authority: false`.

This lane grants no deployment, service, router/firewall/DNS, credential,
wallet/signer, validator, Work Credit, transaction, broadcast, treasury, or
funds authority. It does not retire relay fallback.

## Proof

Run:

```bash
node --import tsx scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts
```

The proof mounts a real loopback UDP socket around a bounded Node surface with
three generated Ed25519 peer identities. Two independent public transports
return differently formatted but canonically identical envelopes, while a
third authenticated private-only peer contributes identity evidence without
becoming a fetch target. A real two-of-two release root and threshold-signed
observer authorization are built for the proof. The collector passes that exact
authorization into the authorized-discovery seam, activates two synthetic routes
through the existing runtime mount, and confirms sanitized status.

The proof also creates two arbitrary authenticated attacker identities that are
not present in the signed observer authorization. Both attackers can satisfy the
transport-agreement requirement and return the same introduction envelope, but
the default signed-observer wrapper rejects them before any bootstrap record or
manifest fetch and before runtime activation. The direct default composition
path is separately required to fail with insufficient live signed-observer
authorization and zero downstream bootstrap fetches.

Additional fail-closed coverage retains split transport responses, invalid
authenticated key binding, a single public transport, explicit composition
rejection, activation rejection, mandatory observer-authorization input, exact
GET/JSON/redirect behavior, and bounded streaming cancellation above 256 KiB.

The focused workflow also reruns the signed-observer authorization proof, the
verified-discovery composition proof, verified-discovery runtime activation,
relay orchestration, and the UDP swarm Node runtime mount on Node.js 22, 24, and
26.

The green marker is:

```text
VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1_PROOF_GREEN
```

## Remaining network gates

The checked-in release root remains `hold_no_signing_keys` with threshold zero
and no public keys. This lane does not publish an active release root, a signed
observer authorization, a relay-introduction envelope, or configure a live
service to start the collector.

Separately reviewed publication of an active release root and observer set,
stable bootstrap artifacts, explicit live dependency wiring, deployment
authorization, service restart, and fresh outside-network N-1 acceptance remain
required before this source contract can support a production
zero-configuration claim.

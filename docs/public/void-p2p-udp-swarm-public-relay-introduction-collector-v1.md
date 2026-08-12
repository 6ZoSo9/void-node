# VOID P2P UDP swarm public relay-introduction collector v1

Status: source contract and deterministic proof only. The collector is not
auto-started, and this lane performs no launcher mutation, deployment, or
service restart.

## Outcome

This lane closes the source-level path from normally authenticated VOID peers
to the merged verified-discovery composition and runtime-activation seams. A
mounted UDP swarm runtime can start the collector with an explicit release root
and the existing bounded bootstrap-record and manifest fetch callbacks. The
collector then:

1. snapshots normally authenticated peers from the live `Node`;
2. rechecks every authenticated Ed25519 public key against its derived node ID;
3. derives one HTTP endpoint from each peer's authenticated, globally routable
   numeric P2P listen address;
4. fetches the fixed well-known introduction path from independent peers;
5. requires at least two peers to return the exact same canonical envelope;
6. passes the envelope and all authenticated source identities to the existing
   signed verified-discovery composition;
7. passes only a successful frozen composition to the existing bounded runtime
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

Transport agreement is replaceability, not authority. Two independent peers
must return byte-semantically identical canonical JSON before the payload can
reach composition. Split, malformed, unavailable, or single-source results
hold the current route state.

## Existing authority seams remain closed

The collector does not verify a release signature itself and cannot weaken the
composition policy. It supplies the active release root, record and manifest
fetch callbacks, authenticated peer IDs and public keys, and the matched
envelope to
`composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1`. That existing boundary
still requires the threshold-signed release root, content-addressed record and
manifest, signed observation quorum, independent relay failure domains, N-1
coverage, freshness, and the exact zero-authority result.

Only that frozen result reaches
`activateVerifiedDiscoveryCompositionV1`. Runtime activation revalidates its
schema, identities, counts, routes, authority exclusions, and ten-minute lease
before atomically replacing verified routes. Composition or activation failure
is a hold, never partial route application.

## Lifecycle, privacy, and limits

The collector is mounted through
`startPublicRelayIntroductionCollectorV1`. It runs once before its bounded
interval begins, prevents overlapping runs, and is stopped with the UDP swarm
runtime mount. It is deliberately not auto-started by the launcher because a
reviewed active release root and production fetch dependencies are separate
authority and deployment gates.

Status exposes only lifecycle booleans, aggregate counts, rejection counters,
and authority flags. It does not expose peer IDs, public keys, transport
endpoints, discovery IDs, signatures, or signed payloads.

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
becoming a fetch target. The proof invokes the existing composition seam,
activates two routes through the production runtime mount, and confirms the
sanitized status.

It also proves fail-closed behavior for split transport responses, an invalid
authenticated key binding, a single public transport, composition rejection,
activation rejection, and resolution of the real checked-in composition
module. The default HTTP client is exercised for exact GET/JSON/redirect
options and cancellation while streaming an oversized response.

The green marker is:

```text
VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1_PROOF_GREEN
```

## Remaining network gates

The checked-in release root remains `hold_no_signing_keys` with threshold zero
and no public keys. This lane does not publish a signed relay-introduction
envelope or configure a live service to start the collector.

Separately reviewed publication of an active release root and stable bootstrap
artifacts, explicit live dependency wiring, deployment authorization, service
restart, and fresh outside-network N-1 acceptance remain required before this
source contract can support a production zero-configuration claim.

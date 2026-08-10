# VOID P2P UDP swarm Node control mount v1

## Purpose

This lane mounts the exact-green authenticated UDP swarm control stack into the real `Node` message loop while deliberately stopping before live UDP socket allocation or direct transport activation.

The mount connects four already-proven layers:

1. normal VOID HELLO/AUTH and retained authenticated peer PEM;
2. authenticated relay reservations and started relay streams;
3. authenticated relay→UDP rendezvous bridge;
4. authenticated control adapter for request, ticket, signed-probe, and offer state.

## Default posture

Every Node gets the in-memory control adapter because it uses the Node's existing Ed25519 identity and local relay-stream state. A relay-side rendezvous bridge is created only when `Node` is constructed with both:

- `relayServer: true`; and
- an explicit `udpSwarmRelayEndpoint`.

Supplying a relay endpoint without `relayServer: true` fails construction. No UDP socket is opened by either option.

Production endpoint validation remains public-by-default. `udpSwarmAllowNonPublicEndpoint` exists for bounded tests and must be explicitly true to use loopback/private endpoints.

## Authenticated wire gate

`VoidUdpSwarmControlMessageV1` is added to the Node wire union, but processing occurs only **after** the existing normal peer authentication gate:

```text
HELLO -> AUTH verify -> peer.handshakeDone -> UDP swarm control
```

A swarm control message is then accepted only from a peer whose transport is `direct`. This is the existing authenticated control relationship between a residential endpoint and its relay; the message is not accepted over the relayed virtual endpoint-to-endpoint data stream.

## Relay request flow

`requestUdpSwarmUpgradeV1(relayNodeId, targetNodeId, streamId)` requires an authenticated direct peer connection to the relay. The underlying #1095 adapter then requires the exact local `(relay, target, stream)` tuple to be started before returning an upgrade request.

Node sends that request only to the exact authenticated relay peer.

On a relay configured with a rendezvous endpoint, the request reaches the #1094 bridge. The bridge requires the same stream to be started in relay-server state, requires requester and target to be its exact authenticated endpoints, and obtains their PEM values only from currently authenticated direct `Peer` records. The coordinator independently re-verifies each PEM↔node-ID binding before tickets are created.

Ticket deliveries are sent only to their exact authenticated direct recipient peers.

## UDP boundary

When a client receives a valid ticket, the #1095 adapter creates two signed mapping-probe actions using the Node's existing private key. Node exposes those actions through:

```text
onUdpSwarmProbeAction
```

It does not allocate a `dgram` socket and does not transmit a UDP packet in this lane.

For the future UDP listener, Node exposes the bounded ingestion seam:

```text
ingestUdpSwarmRendezvousProbeV1(packet, remoteAddress, remotePort)
```

This method passes an already-received datagram plus its kernel-observed source address/port to the relay rendezvous bridge. It performs no socket receive itself. If the observation completes both stable endpoint mappings, resulting upgrade offers are sent over the already-authenticated direct control peers.

## Direct-upgrade boundary

A client that accepts an exact offer exposes it through:

```text
onUdpSwarmDirectUpgradeOffer
```

The callback is an action boundary only. This lane does not create `VoidUdpSwarmUpgradeV1`, does not construct a secure UDP socket, does not call `attachEphemeralDirectTransportV1`, and does not close the relay.

A later lane must convert the offer into the already-proven secure UDP transport, run normal VOID HELLO/AUTH over that transport, and prove a usable authenticated direct session before relay retirement can be considered.

## Cleanup

The mounted adapter is swept with the existing relay maintenance timer. Local relay-stream removal and authenticated direct-peer disconnects also clear affected swarm-control state. A relay server removes bridge state when authenticated endpoint peers disappear.

No PEM is added to public snapshots. `udpSwarmControlSnapshot()` exposes only bounded request/session/stream/peer/ticket metadata already defined by the control adapter.

## Proof

`scripts/prove_void_p2p_udp_swarm_node_control_mount_v1.ts` uses three real `Node` instances and real TCP sockets:

- one relay server with a loopback rendezvous endpoint enabled only under the proof-only nonpublic option;
- one outbound-only modeled target;
- one source.

It establishes normal authenticated source↔relay and target↔relay direct control peers, creates a real reservation and started relay stream, and establishes normal end-to-end VOID authentication over the relay virtual transport.

The proof then establishes:

- a correctly shaped unauthenticated swarm request is ignored before HELLO/AUTH;
- wrong/non-started stream requests fail;
- the source request traverses the real authenticated TCP control peer to the relay;
- relay uses the retained authenticated peer PEMs and exact server stream state;
- real reciprocal ticket messages traverse authenticated TCP control peers to source and target;
- both endpoints emit two distinct signed UDP probe actions;
- the bounded relay datagram-ingest seam accepts the signed probes and records stable mappings;
- the second stable endpoint causes two real authenticated TCP offer deliveries;
- both endpoint Nodes expose the offers only through callbacks;
- the source↔target data path remains `relay` after offers arrive;
- no verified-direct cache evidence is created for the relayed peer;
- Node core imports no UDP socket module and performs no direct-mount call;
- relay disconnect clears the client control routes.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_NODE_CONTROL_MOUNT_V1_PROOF_GREEN
```

## Product relationship

This is the first lane where the online-game-style traversal control sequence is mounted in the actual Node runtime: ordinary nodes can use an existing outbound authenticated relay connection to coordinate direct UDP traversal without router configuration. The actual UDP I/O and secure direct-session activation remain intentionally separate so failure leaves the relay path intact.

## Authority boundary

Source, proof, documentation, CI, branch publication, and draft PR only.

This lane does **not** authorize or perform:

- merge;
- deployment or service restart;
- live UDP socket/listener allocation;
- UDP datagram transmission by Node core;
- automatic direct secure transport activation;
- relay retirement;
- public relay activation;
- router, firewall, DNS, or interface mutation;
- wallet, signer, validator, Work Credit, transaction, broadcast, or money authority.

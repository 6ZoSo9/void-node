# VOID P2P UDP swarm authenticated control adapter v1

## Purpose

This lane turns the exact-green relay→UDP rendezvous bridge into a complete **message/action control sequence** without yet editing `src/node_core.ts` or binding a UDP socket.

It models the sequence the live Node mount will use:

1. a node with an already-started relay stream requests a UDP direct upgrade over its authenticated relay control connection;
2. the relay bridge verifies the exact relay stream and authenticated endpoint key bindings and emits one rendezvous ticket for each endpoint;
3. each endpoint accepts its ticket only from the relay that owns its started local relay stream;
4. each endpoint creates two distinct signed UDP mapping probes using its existing VOID node private key;
5. the relay feeds observed datagrams into the exact-green rendezvous bridge;
6. after both mappings are stable, the relay returns reciprocal upgrade offers to the exact two endpoints;
7. each endpoint accepts an offer only when relay, request, session, stream, peer, and fallback-stream bindings all still match.

The adapter returns actions. It does **not** send TCP or UDP bytes itself.

## Client request boundary

`beginUpgrade(...)` requires:

- a valid relay node ID, target node ID, and relay stream ID;
- all three identities to be distinct where required;
- the caller-provided local relay-stream check to confirm that the exact relay/peer/stream tuple is currently started.

It then creates a bounded request ID and returns one `UDP_SWARM_UPGRADE_REQUEST` control delivery addressed to the relay.

## Relay request boundary

A `UDP_SWARM_UPGRADE_REQUEST` received from an authenticated control peer is accepted only when the adapter has a configured `VoidUdpSwarmRelayBridgeV1`. The bridge rechecks the server-side relay stream, its exact endpoints, and the two authenticated peer PEM bindings before returning reciprocal rendezvous tickets.

## Ticket boundary

A `UDP_SWARM_RENDEZVOUS_TICKET` is accepted only when:

- it is unexpired;
- the sender is the exact relay for a currently started local relay stream;
- `peer_node_id` and `stream_id` match that local stream;
- if this node originated the request, relay/target/stream also match the pending request;
- the ticket/session has not already been installed.

The adapter creates two signed mapping probes with distinct nonces using the node's existing Ed25519 private key. The returned probe actions identify the relay UDP endpoint but perform no socket send.

The constructor also proves the supplied existing local private/public keypair is internally consistent and that the public PEM derives to the supplied local VOID node ID.

## Offer boundary

A `UDP_SWARM_UPGRADE_OFFER` is accepted only when its authenticated sender, request ID, session ID, stream ID, and peer node ID exactly match the installed ticket route and the relay fallback stream is still started.

Acceptance yields a `direct_upgrade_offer` action for the later direct-transport orchestrator. It does not activate a direct transport and does not close the relay.

## Relay fallback

The adapter removes client routes if their tickets expire or their started relay stream disappears. The relay remains authoritative fallback throughout this lane. No successful mapping observation or direct-upgrade offer authorizes relay retirement.

## Proof

`scripts/prove_void_p2p_udp_swarm_authenticated_control_adapter_v1.ts` builds three real Ed25519 identities (two endpoints and one relay), a real started `VoidRelayServerStateV1` stream, the exact-green bridge, and three adapters.

The proof drives the complete control sequence in memory:

- endpoint A emits an upgrade request to the authenticated relay;
- relay returns identity-bound tickets to A and B;
- A and B each emit two distinct signed mapping-probe actions;
- relay observes the same mapped endpoint twice for each peer;
- the final stable observation emits reciprocal offers;
- A and B accept only their exact relay/session/stream/peer offers.

It additionally proves that a missing local relay stream blocks requests, a wrong relay cannot substitute for the ticket or offer sender, a relay rejection clears a pending request, closing the relay stream removes client routes, snapshots expose no PEM, and a mismatched local private/public keypair fails construction.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_AUTHENTICATED_CONTROL_ADAPTER_V1_PROOF_GREEN
```

## Product relationship

This moves VOID closer to the online-game-style node experience: ordinary nodes keep an outbound relay path, use authenticated control traffic to learn observed UDP mappings, attempt direct traversal automatically, and retain relay fallback when direct connectivity is unavailable. It creates no router configuration requirement.

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

This lane does **not** authorize or perform:

- `node_core.ts` mounting;
- live UDP socket allocation or datagram transmission;
- production rendezvous traffic;
- direct secure transport creation;
- relay retirement;
- public relay activation or deployment;
- router, firewall, DNS, or interface changes;
- service restart;
- wallet, signer, validator, Work Credit, transaction, broadcast, or money authority.

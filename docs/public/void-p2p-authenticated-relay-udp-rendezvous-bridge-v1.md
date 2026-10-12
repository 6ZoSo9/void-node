# VOID P2P authenticated relay UDP rendezvous bridge v1

## Purpose

This lane binds the existing relay-stream runtime to the existing authenticated UDP rendezvous coordinator without mounting either surface into `src/node_core.ts` yet.

The bridge accepts a UDP swarm upgrade request only from a caller that already knows the requester's authenticated VOID node ID. It then requires the referenced relay stream to exist, be started, contain that requester, and name the exact opposite stream endpoint as the requested target.

Only after those relay-stream checks pass does the bridge obtain the two already-authenticated peer public PEMs through a caller-supplied lookup and pass them to `VoidUdpSwarmRelayCoordinatorV1`. The coordinator independently re-derives each VOID node ID from the PEM before issuing any rendezvous ticket.

## Why this is the next seam

The parent public-key-retention lane makes the peer PEM available in live private peer memory. The relay runtime already knows the exact source and target node IDs for each started relay stream. The UDP swarm coordinator already knows how to issue identity-bound tickets, validate signed mapping probes, require stable mappings on both endpoints, and emit reciprocal direct-upgrade offers.

This bridge joins those three facts while keeping the live Node message loop and UDP socket allocation out of scope.

## Contract

`VoidUdpSwarmRelayBridgeV1.openAuthenticatedRequest(...)` requires:

- a syntactically valid `UDP_SWARM_UPGRADE_REQUEST`;
- a valid authenticated requester node ID supplied by the future Node integration;
- a currently active, started relay stream matching `stream_id`;
- the requester to be one endpoint of that exact relay stream;
- `target_node_id` to be the exact opposite endpoint;
- an authenticated public PEM lookup result for both endpoints;
- no active duplicate `request_id`.

If those checks pass, the bridge returns exactly two rendezvous-ticket deliveries: one for each authenticated relay endpoint. It does not itself send network bytes.

`VoidUdpSwarmRelayBridgeV1.observeRelayUdpProbe(...)` requires a signed rendezvous probe belonging to an active bridge session whose relay stream is still started. The underlying rendezvous state verifies the signature against the identity-bound public key and rejects replay, wrong-key proof, expired tickets, mapping conflicts, and malformed packets.

A direct-upgrade offer is returned only after both endpoints have produced stable observations under their tickets. The bridge routes each offer back to the correct relay endpoint by authenticated node ID.

## Relay fallback

This lane does not close, retire, demote, or bypass the relay stream. The stream must remain active through rendezvous observation and offer release. Closing the relay stream invalidates the bridge route. A later transport lane must prove a usable authenticated direct session before any relay retirement can be considered.

## Identity boundary

The bridge does not define peer identity. The future `node_core.ts` mount must call it only with node IDs and PEMs obtained from normal VOID HELLO/AUTH state.

The bridge also does not expose PEM values in its snapshot. Its snapshot contains only request/session/stream IDs and authenticated endpoint node IDs.

## Proof

`scripts/prove_void_p2p_authenticated_relay_udp_rendezvous_bridge_v1.ts` constructs real Ed25519 identities and real `VoidRelayServerStateV1` state. It proves:

- a relay stream must be fully started;
- the authenticated requester must be a real endpoint;
- the requested target must be the exact counterpart;
- both endpoint PEMs must be available;
- a wrong PEM cannot inherit another node ID;
- duplicate request IDs are rejected;
- reciprocal identity-bound tickets are produced;
- a wrong-key UDP mapping proof is rejected;
- both mappings must stabilize before offers are released;
- mapping changes fail closed;
- reciprocal offers are routed to the correct authenticated endpoints;
- bridge snapshots contain no PEM;
- closing the relay stream invalidates the rendezvous route;
- no Node mount, UDP socket allocation, direct transport activation, or relay retirement occurs.

Expected terminal marker:

```text
VOID_P2P_AUTHENTICATED_RELAY_UDP_RENDEZVOUS_BRIDGE_V1_PROOF_GREEN
```

## Ordinary-node product requirement

This work remains aligned with the zero-router-configuration node goal. The intended flow is outbound connection to a relay, authenticated relay stream, signed UDP rendezvous probes, direct traversal when possible, and relay fallback when direct traversal does not succeed. Manual port forwarding, UPnP, NAT-PMP, static public IP, public DNS, and inbound TCP reachability are not requirements created by this lane.

## Authority boundary

Source, proof, documentation, CI, branch publication, and draft PR only.

This lane does **not** authorize or perform:

- `node_core.ts` runtime mounting;
- live UDP socket binding or public UDP listener activation;
- production rendezvous traffic;
- direct transport activation;
- relay retirement;
- public relay deployment;
- service restart or deployment;
- router, firewall, DNS, or interface mutation;
- wallet, signer, validator, Work Credit, transaction, broadcast, or money authority.

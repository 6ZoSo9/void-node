# VOID P2P UDP swarm observation evidence v1

## Purpose

This lane preserves the exact stable UDP rendezvous observations produced by the authenticated relay and delivers them to each endpoint in `UDP_SWARM_UPGRADE_OFFER`.

The goal is narrow: `VoidUdpSwarmUpgradeV1` already requires real stable `VoidUdpRendezvousObservationV1` records for the local and remote endpoint. Earlier control lanes carried the mapped endpoint strings but did not carry the complete observation/ticket evidence. This lane closes that gap without synthesizing observation objects.

## Offer evidence

Every normalized `UDP_SWARM_UPGRADE_OFFER` now includes:

- `local_observation` — the relay coordinator's exact stable observation for the recipient;
- `peer_observation` — the relay coordinator's exact stable observation for the counterpart.

Each observation must have exactly the canonical observation keys:

- `ticket_id`
- `node_id`
- `observed_endpoint`
- `first_seen_ms`
- `last_seen_ms`
- `probe_count`
- `stable_same_rendezvous`
- `mapping_conflicted`

The control normalizer requires both observations to be stable and non-conflicted, requires `probe_count` to be within the rendezvous ticket probe budget, canonicalizes the observed endpoints, requires the peer observation node ID to equal `peer_node_id`, requires distinct local/peer ticket IDs, and requires both observation endpoints to equal the corresponding top-level offer endpoints.

## Endpoint binding

The authenticated control adapter applies additional stateful checks that the wire normalizer cannot know on its own:

- the offer must still match the exact authenticated relay/request/session/stream/peer route;
- `local_observation.ticket_id` must equal the exact rendezvous ticket previously installed on this endpoint;
- `local_observation.node_id` must equal this Node's identity;
- `peer_observation.node_id` must equal the exact relay-stream counterpart;
- both observation endpoints must remain identical to the offer endpoints;
- both observations must have been recorded before the installed ticket route expires;
- the relay fallback stream must still be started.

A syntactically valid stable observation from another ticket therefore cannot be substituted for the local evidence.

## Trust boundary

The observations are **relay-observed evidence delivered over the already-authenticated direct relay control peer**. This lane does not make an observed endpoint, a ticket, or the relay evidence itself a replacement for normal VOID peer identity authentication.

The evidence is sufficient to feed the existing direct traversal orchestrator because it preserves the relay's actual stable observation records. The eventual direct UDP transport must still complete its secure bootstrap and then normal VOID HELLO/AUTH before the direct peer is authenticated or relay retirement can be authorized.

This lane does not claim a standalone per-message relay signature over the evidence. Its trust boundary is the existing authenticated control peer. A later hardening lane may add separately signed control attestations without changing the fact that direct peer promotion still requires normal VOID authentication.

## Direct upgrade compatibility

A client that accepts an exact evidence-bearing offer can construct `VoidUdpSwarmUpgradeV1` directly with:

```text
localObservation  = offer.local_observation
remoteObservation = offer.peer_observation
```

No fabricated ticket ID, synthetic probe count, inferred timestamp, or reconstructed observation record is required.

`VoidUdpSwarmUpgradeV1` continues to require both observations to be stable and non-conflicted. Calling `beginPunch()` still does not authorize relay retirement. The existing upgrade class authorizes retirement only after a direct secure socket exists and normal VOID peer authentication has been confirmed for the expected remote node ID.

## Proof

`scripts/prove_void_p2p_udp_swarm_observation_evidence_v1.ts` creates real Ed25519 endpoint/relay identities, a real started relay stream, the authenticated relay bridge, and endpoint/relay control adapters.

It drives the full request → tickets → signed mapping probes → stable relay observations → reciprocal offers sequence and proves:

- each offer contains the exact relay coordinator observation objects;
- the recipient's local ticket ID is preserved exactly;
- the peer ticket ID and peer node ID are preserved exactly;
- both stable probe counts and mapping endpoints are preserved;
- endpoint adapter acceptance binds the local evidence to the exact installed ticket;
- a wrong local ticket ID is rejected;
- a synthetic one-probe observation is rejected;
- conflicted mapping evidence is rejected;
- an evidence/top-level endpoint mismatch is rejected;
- a peer identity mismatch is rejected;
- extra nested observation keys are rejected;
- after rejected tampering, the exact untampered evidence can still be accepted;
- both endpoints can construct `VoidUdpSwarmUpgradeV1` directly from their received offer evidence;
- no synthetic rendezvous record is constructed;
- relay retirement remains unauthorized before direct peer authentication;
- public adapter snapshots expose neither observation evidence nor PEM material.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_OBSERVATION_EVIDENCE_V1_PROOF_GREEN
```

## Product relationship

This is the final evidence handoff needed before a bounded UDP I/O lane can connect the already-mounted Node control callbacks to one real UDP socket. The next transport lane can use the exact received observations to plan hole punching instead of inventing missing metadata.

Ordinary node behavior remains outbound-first with relay fallback. No router configuration, port forwarding, UPnP, NAT-PMP, public DNS, or inbound TCP reachability is introduced by this lane.

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

This lane does **not** authorize or perform:

- merge;
- live UDP socket allocation;
- UDP datagram transmission;
- direct secure transport activation;
- relay retirement;
- deployment or service restart;
- public relay activation;
- router, firewall, DNS, or interface mutation;
- wallet, signer, validator, Work Credit, transaction, broadcast, or money authority.

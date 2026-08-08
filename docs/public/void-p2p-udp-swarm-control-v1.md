# VOID P2P authenticated UDP swarm relay control v1

Status: source-only authenticated relay-control coordination for the zero-router-config UDP swarm path.

## Purpose

The UDP swarm stack can now turn stable rendezvous observations into a secure reliable socket while keeping relay fallback alive. The remaining pre-runtime control problem is how two ordinary nodes obtain those observations without trusting a public IP address supplied by the peer.

This lane makes the existing authenticated relay relationship the coordination channel and makes the relay's UDP socket the rendezvous observer.

## Flow

```text
A ---- authenticated relay stream ---- Relay ---- authenticated relay stream ---- B
                                      |
                                      | UDP rendezvous socket
                                      |
                         observes signed UDP probes

A/B request upgrade on an already-started relay stream
        |
        v
Relay issues identity-bound UDP mapping tickets
        |
        v
A/B send signed UDP probes to relay UDP endpoint
        |
        v
Relay observes actual source IP:port for each node
        |
        v
both mappings stable under their tickets
        |
        v
Relay sends reciprocal UDP_SWARM_UPGRADE_OFFER messages
        |
        v
#1087 bounded punch + secure-session path begins
```

## Authenticated stream boundary

The relay coordinator does not accept a free-floating target pair. Opening a coordination session requires the requester and target to be the exact two cryptographic node IDs on the already authenticated relay stream supplied by the runtime integration.

The requester's and target's Ed25519 public keys must derive to those exact node IDs before rendezvous tickets are issued.

This source layer assumes the caller obtained those IDs/public keys from normal VOID peer authentication. It does not create an alternate identity system.

## UDP rendezvous endpoint

The relay exposes one canonical numeric UDP endpoint as a transport hint. Ordinary participant nodes do not need a fixed UDP port; they send mapping probes from their OS-selected bound UDP sockets.

A later runtime may bind the relay UDP socket to the same numeric port as its TCP P2P listener because UDP and TCP have separate port namespaces. This source contract does not bind a production socket or require a specific port number.

## Control messages

Closed-schema messages:

- `UDP_SWARM_UPGRADE_REQUEST`
- `UDP_SWARM_RENDEZVOUS_TICKET`
- `UDP_SWARM_UPGRADE_OFFER`
- `UDP_SWARM_UPGRADE_REJECT`

`UDP_SWARM_RENDEZVOUS_TICKET` binds request/session/stream, a short-lived rendezvous ticket, the expected peer node ID, relay UDP endpoint, and expiry.

`UDP_SWARM_UPGRADE_OFFER` is released only after both endpoint mappings are stable and non-conflicted. It carries the local and peer observed endpoints plus a bounded punch start delay and attempt timeout.

Neither ticket nor offer defines VOID identity.

## Mapping truth boundary

Each ticket is created by `VoidUdpRendezvousStateV1`, which already requires signed UDP probes bound to the authenticated Ed25519 identity. The relay derives observed endpoint truth from the UDP datagram source tuple.

The coordinator requires both endpoints to reach `stable_same_rendezvous=true` before emitting offers. A mapping conflict under a ticket does not produce an offer.

## Compatibility with swarm upgrade orchestrator

The proof feeds the coordinator's stable observations directly into `VoidUdpSwarmUpgradeV1` and verifies that the resulting punch plan targets the exact reciprocal endpoint from the relay offer.

After the offer, all identity and relay-retirement rules remain those of the #1087 orchestrator: punch success is not identity, secure-socket readiness is not peer promotion, and relay retirement waits for normal VOID peer authentication on the new socket.

## Proof marker

```text
VOID_P2P_UDP_SWARM_CONTROL_V1_PROOF_GREEN
authenticated_relay_stream_required=true
request_bound_to_exact_relay_stream_endpoints=true
ticket_node_identity_binding_required=true
relay_udp_endpoint_transport_hint_only=true
signed_udp_mapping_probe_required=true
wrong_key_mapping_probe_accepted=false
stable_mapping_both_endpoints_required_before_offer=true
mapping_conflict_offer_allowed=false
reciprocal_mapping_offers_proven=true
swarm_upgrade_orchestrator_compatibility_proven=true
offer_defines_peer_identity=false
normal_void_peer_auth_still_required=true
relay_fallback_preserved=true
runtime_node_core_mount_performed=false
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

No merge, `node_core.ts` mutation, live relay UDP socket activation, production identity-key access, peer promotion, relay removal, verified-direct-cache mutation, deployment, service restart, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement.

Refs #1005, #1080, #1087, #1062, #1075.

# VOID P2P UDP hole-punch foundation v1

Status: source-only traversal foundation for launch blocker #1005.

## Product requirement

An ordinary VOID node must not require router configuration, port forwarding,
UPnP, NAT-PMP, a public IP address, a stable DNS name, or operator assistance in
order to join the network.

This lane adopts the connectivity pattern used by consumer real-time software:
open an outbound UDP mapping, coordinate the peer's observed endpoint through an
already authenticated introduction path, send bounded simultaneous UDP punch
bursts from both endpoints, prefer a direct path when it becomes usable, and
preserve relay fallback when direct traversal fails.

A literal video-game-assigned port is not required and does not receive special
firewall authority. VOID v1 recommends UDP port 4700 because UDP and TCP have
separate port namespaces and the existing VOID P2P service already uses TCP
4700. A NAT may rewrite the public UDP port; the observed endpoint is therefore
a transport hint, not network identity.

## Scope

This lane adds only:

- canonical public numeric IPv4 and bracketed IPv6 observed UDP endpoint
  validation;
- a bounded simultaneous-send schedule;
- a small closed-schema `VOID_UDP_PUNCH` datagram;
- strict session/source/target binding for the punch hint;
- a loopback proof using two real Node.js UDP sockets; and
- explicit authority-zero and non-claim boundaries.

It does not modify `src/node_core.ts`, the launcher, relay runtime, TCP direct
upgrade runtime, bootstrap manifests, or live services.

## Punch packet is not identity

A UDP punch packet is deliberately not authenticated peer identity. UDP source
addresses can be spoofed and the punch packet carries no authority.

A successful punch means only that a candidate datagram path was observed. The
normal VOID cryptographic peer-authentication layer remains required before a
remote endpoint can become a trusted VOID peer. An observed IP address, UDP
port, relay, hostname, or NAT mapping never defines VOID node identity.

## Endpoint boundary

Production observed endpoints accept only canonical globally routable numeric
addresses:

- IPv4: `203.0.113.10:4700`-shape syntax, subject to public-range validation;
- IPv6: `[2001:4860:4860::8888]:4700`-shape syntax, subject to public-range
  validation.

Private, loopback, CGNAT, link-local, documentation, benchmark, multicast,
reserved/special-use, DNS-hostname, malformed, and ambiguous unbracketed IPv6
endpoints fail closed.

The proof-only non-public override exists so CI can exercise two real local UDP
sockets without claiming public NAT traversal.

## Bounded send schedule

A plan binds:

- one 128-bit session ID;
- exact local and peer 32-hex VOID node IDs;
- one canonical observed peer endpoint;
- bounded start delay;
- bounded interval;
- bounded burst count; and
- bounded total attempt time.

Defaults are intentionally short: an eight-packet burst begins after 100 ms and
sends every 75 ms. The source rejects a schedule whose last packet would exceed
the configured attempt timeout.

The recommended UDP port is a default, not identity and not a hard protocol
requirement. A participant may use another local port and the NAT may publish a
different observed external port.

## Relay relationship

Relay fallback remains mandatory as a capability for networks where direct
traversal does not work. Symmetric NAT, CGNAT, stateful IPv6 ingress policy,
enterprise filtering, mobile networks, and other middleboxes may defeat a direct
punch.

This foundation does not activate or discover relays. The already-merged relay
reservation runtime remains a separate transport primitive. A later integration
lane may coordinate UDP observed endpoints over an authenticated relay stream,
attempt direct traversal, and retain the healthy relay path on failure.

## Transport boundary

VOID's established P2P session transport is currently TCP. This source lane does
not pretend that a UDP punch packet magically turns TCP into UDP.

A later reviewed integration must choose how an authenticated reliable peer
session uses the punched datagram path (for example a bounded UDP/QUIC-like
transport) or whether the UDP observation is used only as traversal evidence.
No runtime migration is claimed here.

## Proof marker

```text
VOID_P2P_UDP_HOLE_PUNCH_FOUNDATION_V1_PROOF_GREEN
udp_transport_foundation=true
recommended_udp_port=4700
literal_video_game_port_required=false
outbound_udp_mapping_strategy=true
simultaneous_udp_send_receive_proven=true
same_bound_udp_socket_source_port_preserved=true
public_ipv4_observed_endpoint_supported=true
public_ipv6_observed_endpoint_supported=true
private_observed_endpoint_production_accepted=false
punch_packet_authenticated_identity=false
normal_void_peer_auth_still_required=true
router_configuration_required=false
port_forward_required=false
upnp_required=false
nat_pmp_required=false
relay_fallback_preserved=true
direct_public_nat_traversal_claimed=false
runtime_integration_performed=false
wallet_signer_validator_wc_money_authority=0
```

## Non-goals

- claiming real public NAT traversal from CI;
- replacing authenticated VOID identity;
- replacing relay fallback;
- modifying router or firewall state;
- UPnP/NAT-PMP configuration;
- reusing Xbox/PlayStation/Steam assigned ports;
- live relay discovery or activation;
- `node_core.ts` integration while the current TCP direct-upgrade lane is open;
- wallet, signer, validator, Work Credit, transaction, treasury, or money-moving
  authority.

Refs #1005, #1062, #1075.

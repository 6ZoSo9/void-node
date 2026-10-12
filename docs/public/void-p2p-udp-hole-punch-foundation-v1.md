# VOID P2P UDP hole-punch foundation v1

Status: source-only traversal foundation for launch blocker #1005.

## Product requirement

An ordinary VOID node must not require router configuration, port forwarding,
UPnP, NAT-PMP, a public IP address, a stable DNS name, operator assistance, or a
particular local UDP port in order to join the network.

This lane adopts the connectivity pattern used by consumer real-time software:
open an outbound UDP mapping, coordinate the peer's observed endpoint through an
already authenticated introduction path, send bounded simultaneous UDP punch
bursts from both endpoints, prefer a direct path when it becomes usable, and
preserve relay fallback when direct traversal fails.

A literal video-game-associated port is not required and does not receive
special network authority. VOID does not assign ordinary participants one fixed
UDP port. The default local bind request is port `0`, allowing the operating
system to select an available local UDP port. For explicit compatibility or
operator testing, a participant may choose another available port; the
49152-65535 dynamic/private range is the preferred explicit range in this v1
contract.

The rendezvous-observed public IP:port is the transport hint that peers use for
punching. NAT may preserve or rewrite the local source port. Neither a local
port nor a public mapped port becomes VOID node identity.

## Scope

This lane adds only:

- canonical public numeric IPv4 and bracketed IPv6 observed UDP endpoint
  validation;
- a no-fixed-port participant policy with OS-selected local binding by default;
- a bounded simultaneous-send schedule;
- a small closed-schema `VOID_UDP_PUNCH` datagram;
- strict session/source/target binding for the punch hint;
- a loopback proof using two real Node.js UDP sockets bound to OS-selected
  ports; and
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
addresses, with whatever valid port the rendezvous actually observed:

- IPv4: `203.0.113.10:52341`-shape syntax, subject to public-range validation;
- IPv6: `[2001:4860:4860::8888]:61234`-shape syntax, subject to public-range
  validation.

Private, loopback, CGNAT, link-local, documentation, benchmark, multicast,
reserved/special-use, DNS-hostname, malformed, and ambiguous unbracketed IPv6
endpoints fail closed.

The proof-only non-public override exists so CI can exercise two real local UDP
sockets without claiming public NAT traversal.

## Local-port policy

The participant-side default is deliberately not a protocol port:

```text
local_bind_port=0
fixed_participant_udp_port_required=false
```

Port `0` means "ask the operating system for an available local port" at bind
time; it is never advertised as an endpoint. After binding, the actual nonzero
local port exists only as socket state. Rendezvous then records the public
source tuple it observed from an outbound packet.

The explicit dynamic/private policy range is:

```text
49152-65535
```

That range is useful for operator-selected compatibility testing, but it is not
a requirement for OS-selected binds and it is not network identity. A literal
port such as 4700, 3074, or another available port may be tested or configured
where useful, but no such port is a permanent VOID dependency.

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

## Relay relationship

Relay fallback remains mandatory as a capability for networks where direct
traversal does not work. Symmetric NAT, CGNAT, stateful IPv6 ingress policy,
enterprise filtering, mobile networks, and other middleboxes may defeat a direct
punch.

This foundation does not activate or discover relays. The already-merged relay
reservation runtime remains a separate transport primitive. A later integration
lane may coordinate UDP observed endpoints over an authenticated relay stream,
attempt direct traversal, and retain the healthy relay path on failure.

## Real two-site observation

A later operator test from Precision and Alienware successfully sent outbound
UDP to a STUN observer from local UDP port 4700 and observed both IPv4 and IPv6
mappings with the source port preserved at both sites. That result is useful
evidence that the two residential paths permit outbound UDP and port-preserving
mapping in that observation.

It does **not** make UDP 4700 the protocol default. The same test should be
repeated with OS-selected participant ports because the product requirement is
zero fixed participant-port dependency.

A single rendezvous observation also does not classify NAT type or prove that a
direct peer-to-peer punch will succeed.

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
default_local_udp_bind_port=0
fixed_participant_udp_port_required=false
dynamic_private_udp_port_range=49152-65535
literal_video_game_port_required=false
explicit_udp_port_override_allowed=true
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
- requiring any one participant UDP port;
- replacing authenticated VOID identity;
- replacing relay fallback;
- modifying router or firewall state;
- UPnP/NAT-PMP configuration;
- treating Xbox/PlayStation/Steam-associated ports as owned, privileged, or
  permanently required;
- live relay discovery or activation;
- `node_core.ts` integration while the current TCP direct-upgrade lane is open;
- wallet, signer, validator, Work Credit, transaction, treasury, or money-moving
  authority.

Refs #1005, #1062, #1075.

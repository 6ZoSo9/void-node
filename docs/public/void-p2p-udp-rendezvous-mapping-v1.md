# VOID P2P UDP rendezvous mapping v1

Status: source-only child lane of UDP hole-punch foundation PR #1079 for launch blocker #1005.

## Purpose

A normal VOID participant must not need router configuration, port forwarding,
public DNS, a static public IP, or ISP-specific admin access merely to join the
network.

Consumer multiplayer software solves the same boundary by creating outbound UDP
state first. A rendezvous service observes the source IP and source port selected
by the participant's router, returns that observation over an authenticated
control path, and peers can then attempt simultaneous outbound UDP punching.

This lane defines the bounded authenticated mapping primitive needed for that
workflow. It does not activate a live public rendezvous server and does not claim
that public NAT traversal has succeeded yet.

## Relationship to PR #1079

PR #1079 defines the UDP punch packet, endpoint syntax, and bounded punch schedule.
This child adds the missing observation boundary before such a punch plan can be
created safely.

The participant-side default local UDP bind request is port `0`, allowing the
operating system to select an available local port. No fixed participant UDP port
is required by the protocol. An explicit available port such as `4700` may still
be used for compatibility or operator testing, but it is not identity and it is
not a permanent VOID dependency. A router may preserve or rewrite whatever local
source port was selected; the rendezvous observation records the public endpoint
actually seen.

## Control-path boundary

A rendezvous ticket may be issued only after an ordinary cryptographically
authenticated VOID control session already exists. Integration is expected to use
an outbound participant-to-relay/control connection, so residential inbound access
is not required.

The ticket binds:

- the authenticated 32-hex VOID node ID;
- the exact authenticated Ed25519 public key already associated with that node ID;
- a random 128-bit ticket ID;
- issuance time; and
- a short bounded expiry from 1 through 30 seconds.

A ticket is transport coordination only. It never becomes node identity.

## UDP mapping probe

The participant sends a closed-schema datagram:

```text
VOID_UDP_MAP_PROBE
```

containing:

- protocol version;
- ticket ID;
- node ID;
- random 128-bit per-probe nonce; and
- Ed25519 signature over a domain-separated transcript containing those exact
  values.

The rendezvous verifies the signature using the public key pinned by the already
authenticated control session. A valid signature from another key is rejected.
Changing the ticket, node ID, or nonce invalidates the signature.

A nonce is accepted only once per ticket, and every ticket has a bounded probe
budget. This prevents a captured probe packet from becoming an unbounded replay
mechanism.

## Observed endpoint truth

The rendezvous derives the observed UDP endpoint exclusively from the UDP socket's
remote address and source port. The participant does not tell the rendezvous what
its public endpoint is.

Production observations accept only canonical globally routable numeric IPv4 or
bracketed IPv6 endpoints. Loopback/private/CGNAT/link-local/documentation,
multicast, and other special-use endpoints are rejected. A constructor-only
non-public override exists for isolated proof fixtures.

Two matching probes through one ticket establish only
`stable_same_rendezvous=true`. They do **not** establish endpoint-independent NAT
behavior. Direct-path confidence requires observations from separate rendezvous
failure domains in a later planner/integration lane.

If the observed endpoint changes within one ticket, the ticket is marked
conflicted and is not silently rewritten into a stable mapping.

## Identity boundary

Neither of these defines VOID identity:

- rendezvous ticket;
- observed IP:port.

The UDP mapping signature proves that the holder of the authenticated node key sent
that mapping probe. It does not replace the normal end-to-end VOID peer
authentication required after transport establishment.

## Failure behavior

UDP mapping or hole punching is an optimization. If UDP is blocked, the mapping is
unstable, rendezvous services disagree, or direct punching fails, the already
established relay path remains the connectivity fallback.

The product target is therefore:

```text
start VOID
  -> outbound introduction/relay
  -> try UDP mapping and direct upgrade
  -> keep direct path if authenticated and healthy
  -> otherwise remain connected through relay
```

A participant must not be asked to open ports to make this work.

## Required proof marker

```text
VOID_P2P_UDP_RENDEZVOUS_MAPPING_V1_PROOF_GREEN
authenticated_control_ticket_required=true
ticket_node_id_public_key_binding_required=true
udp_probe_signature_required=true
udp_probe_replay_accepted=false
wrong_key_udp_probe_accepted=false
private_observed_endpoint_production_accepted=false
same_rendezvous_mapping_repeat_stable=true
same_ticket_mapping_change_accepted=false
cross_rendezvous_mapping_stability_required=true
observed_endpoint_defines_node_identity=false
normal_void_peer_auth_still_required=true
router_configuration_required=false
port_forward_required=false
relay_fallback_preserved=true
direct_public_nat_traversal_claimed=false
runtime_integration_performed=false
wallet_signer_validator_wc_money_authority=0
```

## Non-goals

- live public rendezvous activation;
- integration into `src/node_core.ts`;
- QUIC/reliable authenticated transport over the punched UDP path;
- public relay deployment;
- UPnP/NAT-PMP/router mutation;
- firewall mutation;
- bootstrap-record publication;
- claiming a particular NAT type from one rendezvous observation;
- wallet, signer, validator, Work Credit, transaction, or money-moving authority.

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft stacked PR
only. No deployment, restart, live network activation, router/firewall/DNS mutation,
credential access, wallet/signer/validator/Work Credit authority, transaction action,
or fund movement.

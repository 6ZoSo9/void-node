# VOID P2P authenticated UDP path v1

Status: source-only path-authentication layer for launch blocker #1005.

## Purpose

The real Precision/Alienware field test proved that two ordinary residential
machines can bind OS-selected UDP ports and exchange direct public-Internet
packets without router configuration, port forwarding, UPnP, NAT-PMP, or a
fixed participant port.

That result establishes reachability only. A datagram arriving from the
rendezvous-observed IP:port must not become a trusted VOID peer merely because
it arrived.

This lane adds the next boundary: cryptographically prove that the holder of the
expected VOID Ed25519 node identity controls the exact punched datagram path for
one fresh session.

## Relationship to the UDP traversal foundation

PR #1079 supplies the UDP hole-punch packet, OS-selected participant-port policy,
observed endpoint validation, bounded punch scheduling, and relay fallback.
PR #1080 adds authenticated rendezvous mapping. Both are merged before this lane
is reconciled to current `main`.

This PR does not modify `src/node_core.ts`.

An IP address, UDP port, NAT mapping, rendezvous server, relay, or punch packet
never defines VOID identity.

## Handshake

Each endpoint already knows the expected peer VOID node ID through an
authenticated control/relay context or another separately trusted introduction
path.

The direct UDP authentication exchange uses two closed-schema packet types:

```text
VOID_UDP_AUTH_HELLO
VOID_UDP_AUTH_PROOF
```

Each endpoint creates a fresh 256-bit challenge and sends a HELLO bound to:

- protocol version;
- `identity_algorithm=ed25519`;
- `signature_algorithm=ed25519`;
- one 128-bit path session ID;
- exact source VOID node ID;
- exact target VOID node ID;
- canonical Ed25519 public key; and
- the fresh challenge.

The node ID must equal the existing VOID derivation from the canonical Ed25519
public PEM.

After both HELLO packets are known, each endpoint signs a domain-separated
proof transcript containing:

- protocol version;
- exact identity and signature algorithm tags;
- exact session ID;
- source and target VOID node IDs;
- source public key;
- both fresh challenges; and
- the exact rendezvous-observed source and target UDP endpoints.

The receiving endpoint verifies the signature against the expected peer public
key and requires the exact reciprocal algorithm/session/challenge/endpoint
bindings.

## Algorithm agility and quantum-safety boundary

This v1 protocol is deliberately explicit about its classical cryptography.
Only these exact values are accepted:

```text
identity_algorithm=ed25519
signature_algorithm=ed25519
```

The tags are present in both HELLO and PROOF, and the PROOF signature binds them
inside the signed transcript. Unknown, substituted, omitted, or additional
algorithm fields fail closed.

Those explicit fields are an extension point for a separately reviewed future
protocol version. They are **not** runtime negotiation and they do not make this
v1 protocol post-quantum or quantum-safe. Ed25519 remains the only accepted v1
identity/signature algorithm, and `quantum_safe_claimed=false` is part of the
proof boundary.

## Replay and substitution boundary

A previously valid proof does not authenticate a fresh exchange because the
fresh local challenge changes the signed transcript.

The verifier also rejects:

- an unknown or substituted identity algorithm;
- an unknown or substituted signature algorithm;
- a signature from a different Ed25519 private key;
- a different session ID;
- a different source or target node ID;
- a different observed source or target endpoint;
- malformed or noncanonical public keys;
- node-ID/public-key mismatch;
- malformed challenges or signatures; and
- unknown packet fields.

Production path proofs accept only canonical globally routable observed UDP
endpoints. The focused proof uses an explicit non-public test override only so
real loopback UDP sockets can exercise the full exchange in CI.

## Path-authentication truth

Successful verification means:

> the expected VOID Ed25519 identity proved possession of its private key over
> this exact fresh algorithm/session/challenge/endpoint-binding transcript.

It does **not** yet mean:

- the datagram transport is reliable;
- packets are ordered;
- arbitrary post-authentication payloads are encrypted or integrity protected;
- the runtime should replace a healthy relay path;
- verified-direct peer cache should be mutated;
- the punched endpoint is durable reachability evidence; or
- the protocol is quantum-safe.

Those are later integration/transport/cryptographic-version decisions.

## Real field evidence boundary

The preceding two-site test produced:

```text
participant_bind_policy=os_selected_port_zero
fixed_participant_port_required=false
precision_direct_udp_received=true
alienware_direct_udp_received=true
router_configuration_required=false
port_forward_required=false
direct_udp_data_via_tailscale=false
real_two_site_udp_hole_punch_success=true
VOID_UDP_TWO_SITE_DIRECT_PUNCH_V1_GREEN
```

The raw public addresses are intentionally not part of this source contract.
The observation proves one real direct traversal success between the two test
networks, not universal NAT compatibility.

## Relay relationship

The relay remains the usable path before and during a direct-path attempt.
Authentication failure, timeout, endpoint change, algorithm mismatch, or later
transport failure must leave relay fallback available.

Direct UDP is an optimization, not an onboarding prerequisite.

## Focused proof marker

```text
VOID_P2P_UDP_AUTHENTICATED_PATH_V1_PROOF_GREEN
real_udp_socket_exchange_proven=true
void_ed25519_identity_required=true
identity_algorithm_explicit=true
signature_algorithm_explicit=true
algorithm_confusion_accepted=false
crypto_agility_extension_point_explicit=true
quantum_safe_claimed=false
node_id_public_key_binding_required=true
mutual_fresh_challenges_required=true
exact_session_binding_required=true
exact_peer_node_id_binding_required=true
exact_observed_endpoint_binding_required=true
wrong_key_udp_auth_accepted=false
replayed_challenge_udp_auth_accepted=false
wrong_observed_endpoint_udp_auth_accepted=false
unknown_packet_fields_accepted=false
observed_endpoint_defines_node_identity=false
reliable_ordered_transport_claimed=false
runtime_peer_promotion_performed=false
verified_direct_cache_mutation_performed=false
relay_fallback_preserved=true
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

## Authority boundary

Source, proof, documentation, CI, branch publication, and draft PR only.

No runtime integration, live VOID identity-key access, production UDP session
activation, peer promotion, verified-peer-cache mutation, relay activation,
deployment, service restart, router/firewall/DNS/interface mutation, wallet,
signer, validator, Work Credit, transaction, treasury, or fund authority.

Refs #1005, #1079, and #1080.

# VOID P2P secure reliable UDP transport v1

Status: source/proof-only transport layer stacked on authenticated punched UDP path PR #1082.

## Purpose

The real Precision/Alienware field run proved that two ordinary residential nodes can:

1. bind OS-selected UDP ports;
2. discover their public mappings;
3. punch directly through the public Internet without router configuration; and
4. mutually authenticate the exact punched path with VOID-shaped Ed25519 identities.

That is not yet a usable replacement for the established reliable TCP peer stream. UDP can lose, duplicate, reorder, or modify datagrams. This lane adds the next bounded primitive: a cryptographically protected, ordered, retransmitted datagram stream suitable for later runtime integration.

## Cryptographic boundary

A successfully authenticated punched path is extended with a fresh X25519 key exchange.

Each endpoint creates an ephemeral X25519 keypair. Its key offer is signed by the already authenticated Ed25519 VOID identity and binds:

- exact direct-path session ID;
- exact source and target VOID node IDs;
- canonical Ed25519 public key;
- ephemeral X25519 public key;
- exact source and target rendezvous-observed UDP endpoints; and
- a fresh offer nonce.

A substituted X25519 key, endpoint, node ID, session, or nonce invalidates the Ed25519 signature.

The reciprocal signed offers feed X25519 Diffie-Hellman and HKDF-SHA256. Direction-specific keys and nonce prefixes are derived separately for `A -> B` and `B -> A`.

Application payloads use AES-256-GCM. Packet headers are authenticated as additional data, binding:

- protocol version;
- session ID;
- source and target node IDs;
- packet kind;
- packet number;
- reliable data sequence; and
- cumulative ACK sequence.

Each encrypted packet uses a unique direction-local packet number in its AEAD nonce. Retransmission of one reliable data sequence creates a new encrypted packet with a new packet number; an AES-GCM nonce is never intentionally reused.

## Reliability boundary

Reliable data sequence numbers are distinct from encrypted packet numbers.

The sender has:

- at most 32 unacknowledged application messages;
- 250 ms fixed retransmission timeout in v1;
- at most 5 retransmissions per data sequence; and
- no infinite retry.

The receiver has:

- a 64-message ordered receive window;
- out-of-order buffering within that window;
- contiguous ordered delivery only;
- duplicate data suppression; and
- a bounded packet-number replay window.

ACK-only packets are also AES-256-GCM protected. They carry no application payload and are not themselves retransmitted.

This v1 is deliberately **not** a full QUIC implementation. It does not claim adaptive congestion control, path migration, connection IDs, stream multiplexing, PMTU discovery, 0-RTT, or universal Internet behavior. A later runtime integration must keep traffic bounded and preserve relay fallback.

## Relay and onboarding relationship

Direct UDP remains an optimization, never an onboarding requirement.

An ordinary participant still must not need:

- a fixed UDP port;
- router configuration;
- port forwarding;
- UPnP;
- NAT-PMP;
- static IPv4/IPv6;
- participant DNS; or
- operator assistance.

If rendezvous, punching, authentication, key agreement, or reliable transport establishment fails, the already-established relay path remains the fallback. A failed direct attempt must not destroy a healthy relay session.

## Runtime boundary

This lane does not edit `src/node_core.ts` and does not promote any UDP session into the live peer map.

It does not:

- write verified-direct cache state;
- change bootstrap policy;
- activate public rendezvous/relay infrastructure;
- deploy or restart a service;
- read production node identity keys;
- mutate router/firewall/DNS state; or
- gain wallet, signer, validator, Work Credit, transaction, treasury, or money-moving authority.

## Proof marker

```text
VOID_P2P_UDP_SECURE_RELIABLE_TRANSPORT_V1_PROOF_GREEN
real_udp_secure_payload_exchange_proven=true
x25519_ephemeral_key_agreement_required=true
x25519_offer_ed25519_bound=true
aes_256_gcm_payload_confidentiality_integrity=true
tampered_ciphertext_accepted=false
packet_replay_accepted=false
out_of_order_delivery_reordered_correctly=true
dropped_packet_retransmission_recovered=true
encrypted_ack_supported=true
send_window_bounded=true
receive_window_bounded=true
retransmission_retry_limit_bounded=true
unbounded_retry_allowed=false
congestion_control_claimed=false
runtime_peer_promotion_performed=false
verified_direct_cache_mutation_performed=false
relay_fallback_preserved=true
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

The focused proof uses generated Ed25519 and X25519 test identities, real loopback UDP sockets for encrypted wire exchange, deliberate reordering/loss/retransmission, AEAD tampering, replay, window overflow, wrong key material, and endpoint-binding adversarial cases.

Refs #1005, #1079, #1082.

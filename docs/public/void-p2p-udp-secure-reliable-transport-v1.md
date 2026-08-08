# VOID P2P secure reliable UDP transport v1

Status: source/proof-only transport layer above the authenticated punched UDP path now merged from PR #1082.

## Purpose

The real Precision/Alienware field sequence established that ordinary residential nodes can bind OS-selected UDP ports, discover public mappings, punch directly without router configuration, and authenticate the punched path with VOID-shaped identities.

That still is not a reliable peer stream. UDP can lose, duplicate, reorder, or modify datagrams. This lane adds a bounded encrypted, ordered, retransmitted datagram stream suitable for later runtime composition while preserving relay fallback.

## Required authenticated-path evidence

Secure transport establishment is not a second independent peer-authentication scheme.

Before a secure key offer is accepted, the verifier must successfully re-run the merged PR #1082 `verifyVoidUdpAuthenticatedPathProofV1` boundary for that exact peer/path. The key offer then binds the exact authenticated-path proof signature together with the same:

- session ID;
- source and target VOID node IDs;
- canonical Ed25519 public key;
- source and target rendezvous-observed UDP endpoints; and
- authenticated-path protocol version.

A key offer whose authenticated-path evidence is absent, belongs to the opposite peer, has a different endpoint/session/identity, or carries a substituted proof signature fails closed.

The X25519 key-offer signature is therefore an authenticated key-establishment continuation of the already verified #1082 path, not a parallel trust root.

## Explicit v1 cryptographic suite

The v1 wire contract names every cryptographic role explicitly:

```text
identity_algorithm=ed25519
signature_algorithm=ed25519
kex_algorithm=x25519
kdf_algorithm=hkdf-sha256
aead_algorithm=aes-256-gcm
```

Those exact tags are included in the signed key offer. The authenticated-path proof signature and suite metadata also feed the KDF salt. Secure data and ACK packets carry the exact AEAD tag and authenticate it as part of packet additional data.

Unknown or substituted identity, signature, KEX, KDF, or AEAD algorithms are rejected rather than guessed, downgraded, or silently mapped to the current implementation.

These fields are a crypto-agility extension point for a future protocol version. They do **not** make this v1 suite post-quantum. Ed25519 and X25519 are classical public-key algorithms, so:

```text
quantum_safe_claimed=false
```

A future quantum-resistant or hybrid suite requires an explicit versioned contract, proofs, migration policy, and interoperability work; it must not be implied by these tags.

## Key agreement and derivation

Each endpoint creates a fresh ephemeral X25519 keypair. Its offer is signed by the Ed25519 identity already bound by the verified authenticated-path evidence and includes:

- exact authenticated-path proof signature;
- exact cryptographic-suite tags;
- exact direct-path session ID;
- exact source and target VOID node IDs;
- canonical Ed25519 public key;
- ephemeral X25519 public key;
- exact source and target observed UDP endpoints; and
- a fresh offer nonce.

A substituted X25519 key, suite tag, proof signature, endpoint, node ID, session, or nonce invalidates acceptance.

Reciprocal accepted offers feed X25519 Diffie-Hellman and HKDF-SHA256. Direction-specific keys and nonce prefixes are derived separately for `A -> B` and `B -> A`.

## Packet confidentiality and integrity

Application payloads and ACK packets use AES-256-GCM. Packet headers are authenticated as additional data, binding:

- protocol version;
- AEAD algorithm tag;
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
authenticated_path_evidence_required=true
authenticated_path_proof_binding_required=true
authenticated_path_evidence_mismatch_accepted=false
identity_algorithm_explicit=true
signature_algorithm_explicit=true
kex_algorithm_explicit=true
kdf_algorithm_explicit=true
aead_algorithm_explicit=true
identity_algorithm_substitution_accepted=false
signature_algorithm_substitution_accepted=false
kex_algorithm_substitution_accepted=false
kdf_algorithm_substitution_accepted=false
aead_algorithm_substitution_accepted=false
algorithm_confusion_rejected=true
crypto_agility_extension_point_explicit=true
quantum_safe_claimed=false
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

The focused proof generates #1082 authenticated-path HELLO/PROOF evidence, generated Ed25519 and X25519 test keys, real loopback UDP sockets for encrypted wire exchange, deliberate reordering/loss/retransmission, AEAD tampering, replay, bounded-window overflow, wrong KEX key material, wrong authenticated-path evidence, proof-signature substitution, and identity/signature/KEX/KDF/AEAD algorithm-confusion attempts.

Refs #1005, #1079, #1082.

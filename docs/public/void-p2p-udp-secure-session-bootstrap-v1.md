# VOID P2P UDP secure session bootstrap v1

Status: source-only composition above the authenticated punched UDP path, secure reliable UDP transport, and peer-socket adapter.

## Purpose

The lower UDP stack now proves four separate boundaries:

1. ordinary nodes can use OS-selected outbound UDP mappings without router setup;
2. peers can punch a direct residential path and bind it to expected VOID Ed25519 identities;
3. mutually authenticated endpoints can establish signed ephemeral X25519 session keys and AES-256-GCM protected reliable delivery; and
4. that secure/reliable delivery can expose the socket-shaped ordered byte stream expected by the existing VOID peer framer.

This lane composes those boundaries into one bootstrap controller without modifying `src/node_core.ts`.

The controller deliberately stops at a ready `VoidUdpPeerSocketAdapterV1`. A later runtime mount may pass that socket-shaped object into the existing peer attachment path only after this controller reports ready.

## Input boundary

`VoidUdpSecureSessionBootstrapV1` receives:

- one exact 128-bit session ID;
- exact local and expected remote 32-hex VOID node IDs;
- the local Ed25519 public/private identity pair;
- exact local and remote rendezvous-observed UDP endpoints;
- the established secure-packet transmit callback;
- optional bounded peer-socket adapter settings; and
- an optional one-shot ready callback.

The source does not perform rendezvous, NAT discovery, router configuration, hole punching, relay reservation, or runtime peer mutation itself.

## State machine

The controller exposes these states:

```text
awaiting_remote_hello
awaiting_path_proofs
awaiting_key_offers
ready
closed
```

No ready socket exists before every required authentication layer completes.

## Mutual path-auth boundary

Each side creates its normal UDP authenticated-path HELLO. The remote HELLO must match:

- exact session ID;
- exact expected remote node ID;
- exact local target node ID; and
- canonical Ed25519 public-key-to-node-ID derivation.

Each side then signs a path proof binding:

- both fresh challenges;
- exact source and target VOID identities;
- exact session; and
- exact reciprocal rendezvous-observed UDP endpoints.

The controller requires both its locally created proof and the verified remote proof before a secure key offer may become sufficient for readiness.

## Authenticated-path evidence and secure-suite inheritance

The bootstrap does not create a parallel trust root for secure transport.

When it creates its local secure key offer, the controller passes the exact stored local authenticated-path proof into the merged secure-transport contract. When it verifies a remote key offer, it passes the exact stored remote proof together with the already accepted remote/local HELLO pair and the exact observed endpoint pair as `authenticatedPathEvidence`.

That means a secure key offer is accepted only when its signed `authenticated_path_proof_sig` matches the proof already verified by this bootstrap for the same session, identities, public key, and observed endpoints. Substituting a different proof signature, session, endpoint, identity, or cryptographic-suite tag fails closed.

The secure transport's explicit v1 suite is inherited unchanged:

```text
identity_algorithm=ed25519
signature_algorithm=ed25519
kex_algorithm=x25519
kdf_algorithm=hkdf-sha256
aead_algorithm=aes-256-gcm
```

Those tags provide a versioned crypto-agility extension point; they are not a post-quantum claim. This composed v1 session remains based on classical Ed25519/X25519 public-key cryptography:

```text
quantum_safe_claimed=false
```

A future hybrid or quantum-resistant suite requires a separately versioned contract and migration proof rather than silent substitution inside this controller.

## Signed X25519 boundary

After mutual path authentication, each side creates a fresh ephemeral X25519 keypair and signs its X25519 offer with the already-authenticated Ed25519 VOID identity.

The remote key offer must pass the secure-transport verifier, must bind the exact stored authenticated-path evidence, and its exact Ed25519 public key must equal the key authenticated by the remote path HELLO. This prevents a later key-exchange message from silently changing peer identity or path evidence.

Only reciprocal signed offers can produce the direction-specific secure transport keys.

Duplicate identical UDP bootstrap messages are idempotent. They may be accepted again because datagram duplication is normal, but they cannot trigger a second ready transition or a second socket construction.

## Ready socket

After all gates pass, the controller creates:

- `VoidUdpSecureReliableSenderV1`;
- `VoidUdpSecureReliableReceiverV1`; and
- `VoidUdpPeerSocketAdapterV1`.

The optional ready callback fires exactly once with the socket-shaped adapter.

The resulting object exposes the subset already consumed by the current VOID peer attachment path:

```text
on("data")
on("close")
on("error")
write(bytes|string)
destroy(error?)
writableLength
```

The existing runtime also treats local/remote address metadata as optional on `PeerSocketV1`, so the adapter does not need to impersonate a full Node `net.Socket`.

## Failure and relay boundary

Invalid or mismatched HELLO, path proof, authenticated-path evidence, secure-suite tag, or key offer does not produce a ready socket.

This source lane does not tear down, replace, or mutate the existing relay path. The future runtime composition must preserve the authenticated relay until the direct UDP socket has completed this bootstrap and then completed normal VOID peer framing/authentication.

A direct-session timeout or bootstrap rejection therefore remains a direct-path failure, not proof that the node is unreachable or permanently relay-only.

## Proof

The focused proof creates two generated Ed25519 identities and two loopback observed endpoints, then exercises both controllers through the full state machine.

It proves:

- wrong-session HELLO rejection;
- exact reciprocal HELLO acceptance;
- wrong-endpoint path-proof rejection;
- mutual Ed25519 path proof before key readiness;
- exact local/remote authenticated-path proof-signature binding into secure offers;
- authenticated-path evidence substitution rejection;
- cryptographic-suite substitution rejection;
- tampered signed X25519 offer rejection;
- local Ed25519 private/public mismatch rejection;
- duplicate key-offer idempotence;
- exactly-once ready callbacks;
- bidirectional secure socket bytes after readiness; and
- clean close with no runtime or authority mutation.

Expected marker:

```text
VOID_P2P_UDP_SECURE_SESSION_BOOTSTRAP_V1_PROOF_GREEN
mutual_ed25519_path_auth_required=true
exact_observed_endpoint_binding_required=true
authenticated_path_proof_binding_required=true
secure_offer_path_evidence_substitution_accepted=false
signed_x25519_offer_required=true
x25519_offer_must_match_authenticated_identity=true
secure_transport_algorithm_suite_bound=true
secure_transport_suite_substitution_accepted=false
crypto_agility_extension_point_inherited=true
quantum_safe_claimed=false
secure_reliable_transport_required=true
peer_socket_adapter_required=true
ready_before_remote_path_proof=false
ready_before_local_path_proof=false
ready_before_reciprocal_key_offers=false
duplicate_key_offer_idempotent=true
bidirectional_socket_bytes_after_ready=true
wrong_session_hello_accepted=false
wrong_endpoint_path_proof_accepted=false
tampered_x25519_offer_accepted=false
local_identity_key_mismatch_accepted=false
ready_callback_exactly_once=true
runtime_node_core_mount_performed=false
runtime_peer_promotion_performed=false
verified_direct_cache_mutation_performed=false
relay_fallback_preserved=true
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

## Runtime boundary

This lane does **not** modify `src/node_core.ts` and does not call its private `attachSocket()` method.

A later separately reviewed runtime composition can remain small:

1. keep the existing authenticated relay continuity path;
2. obtain a validated UDP observed endpoint through the rendezvous layer;
3. complete direct punch/path authentication;
4. run this secure-session bootstrap;
5. pass the resulting socket-shaped adapter into normal VOID peer attachment with the expected remote node ID pinned; and
6. retire or demote relay transport only after normal end-to-end VOID HELLO/AUTH succeeds on the mounted direct path.

## Authority / non-claims

No runtime mount, deployment, restart, live production node identity-key access, public rendezvous/relay activation, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement is performed by this lane.

Refs #1005, #1079, #1082, #1083, #1084, #1075.

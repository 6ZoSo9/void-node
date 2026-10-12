# VOID P2P UDP swarm upgrade orchestrator v1

Status: source-only convergence of authenticated UDP rendezvous, bounded hole punching, secure-session bootstrap, and relay-preserving promotion policy.

## Purpose

The lower UDP stack now proves the individual pieces needed for zero-router-config peer connectivity:

- authenticated rendezvous mapping;
- bounded UDP hole punching with OS-selected participant ports;
- mutual authenticated-path proof with the expected VOID identity;
- path-evidence-bound ephemeral X25519 key agreement;
- AES-256-GCM protected reliable delivery; and
- a socket-shaped byte stream for the normal VOID peer framer.

This lane composes those pieces into one upgrade lifecycle without modifying `src/node_core.ts`.

## Product path

```text
authenticated relay/control path
        |
        v
verified authenticated-rendezvous observations
        |
        v
bounded simultaneous UDP punch plan
        |
        v
direct datagram path observed
        |
        v
#1086 authenticated-path evidence + secure-session bootstrap
        |
        v
secure reliable socket-shaped transport
        |
        v
normal VOID HELLO/AUTH on that socket
        |
        v
direct peer authenticated
        |
        v
relay retirement may be considered
```

The relay is continuity infrastructure, not identity. It remains usable until the new direct path has completed normal VOID peer authentication.

## Authenticated rendezvous observation provenance

A `VoidUdpRendezvousObservationV1` is a compact observation record. The detached object does not itself carry the ticket public key, accepted probe signatures, or replay-nonce state that made the observation trustworthy inside `VoidUdpRendezvousStateV1`.

Therefore this orchestrator does **not** silently trust a structurally plausible detached observation.

Construction requires `verifyAuthenticatedRendezvousObservation`, a synchronous verifier supplied by the authenticated control/rendezvous integration. Both the local and remote observation must:

- pass the structural/stability checks in this module; and
- be accepted by that verifier for the exact expected node ID.

The intended verifier is backed by authenticated #1080 rendezvous/control state or an equivalent reviewed provenance boundary. If the verifier is absent, throws, or returns anything other than `true`, construction fails closed.

This module does not re-run the original UDP probe signatures itself because it does not own the private ticket/public-key/nonce state required for that verification. The boundary is explicit:

```text
authenticated_rendezvous_observation_verifier_required=true
unverified_detached_rendezvous_observation_allowed=false
rendezvous_probe_signature_reverification_performed_here=false
```

The focused proof backs the verifier with a live `VoidUdpRendezvousStateV1` snapshot and proves that a fabricated but structurally eligible detached observation is rejected.

## Rendezvous eligibility boundary

After provenance verification, the orchestrator accepts only observations that:

- belong to the exact expected cryptographic node ID;
- have at least two accepted probes under the ticket;
- are stable at one endpoint within that rendezvous;
- are not marked mapping-conflicted; and
- carry bounded timestamps and a valid ticket identifier.

A rendezvous-observed endpoint remains a transport hint. It never defines node identity.

This v1 requires same-rendezvous repeat stability before attempting the direct path. Cross-rendezvous stability remains a stronger confidence signal for later persistence/reachability policy and is not silently promoted by this orchestrator.

## Inherited secure-session boundary

The orchestrator does not implement a second key-establishment path. After a direct datagram path is observed, it delegates to the exact #1086 `VoidUdpSecureSessionBootstrapV1` state machine.

That means the secure socket inherits the already-proven requirements that:

- the local secure key offer binds the exact stored authenticated-path proof;
- the remote secure key offer is verified against the exact stored remote path proof, accepted HELLOs, session, identities, and observed endpoints;
- path-proof-signature substitution fails closed; and
- secure-suite substitution fails closed.

The inherited v1 cryptographic suite is explicit:

```text
identity_algorithm=ed25519
signature_algorithm=ed25519
kex_algorithm=x25519
kdf_algorithm=hkdf-sha256
aead_algorithm=aes-256-gcm
quantum_safe_claimed=false
```

These explicit fields are a crypto-agility extension point, not a post-quantum claim. A future quantum-resistant or hybrid suite requires a separately versioned contract, proofs, migration policy, and interoperability work.

## Relay-retirement boundary

Three states are intentionally distinct:

1. UDP punch packets are flowing;
2. a cryptographically secure reliable UDP socket is ready; and
3. normal VOID peer HELLO/AUTH has authenticated the expected remote node on that socket.

Only state 3 authorizes relay retirement in this contract.

A secure socket becoming ready does not itself promote a peer, mutate verified-direct cache truth, advertise listen addresses, or authorize relay removal.

If the direct attempt fails at any earlier stage, the orchestrator enters `direct_failed_relay_preserved`. A fresh session is required for another direct attempt.

## Explicit phases

```text
relay_only
punch_planned
secure_bootstrap
direct_socket_ready
direct_peer_authenticated
direct_failed_relay_preserved
closed
```

## Runtime boundary

This PR does not edit or call the private `Node.attachSocket()` path.

A later runtime composition can:

1. retain the authenticated relay/control relationship;
2. obtain rendezvous observations through the authenticated #1080 boundary;
3. supply a provenance verifier for those observations;
4. run the punch schedule from the same UDP socket used for mapping;
5. feed bootstrap packets into the inherited #1086 source stack;
6. receive a ready socket-shaped adapter;
7. attach that adapter to the existing VOID `Framer`/HELLO/AUTH path with the expected remote node ID pinned; and
8. retire or demote the relay only after that normal peer authentication succeeds.

The existing TCP direct-upgrade lane may remain an optional transport experiment, but it is not required for the UDP zero-config path proven here.

## Proof marker

```text
VOID_P2P_UDP_SWARM_UPGRADE_V1_PROOF_GREEN
authenticated_rendezvous_observations_consumed=true
authenticated_rendezvous_observation_verifier_required=true
unverified_detached_rendezvous_observation_accepted=false
rendezvous_probe_signature_reverification_performed_here=false
stable_same_rendezvous_mapping_required=true
mapping_conflict_accepted=false
bounded_hole_punch_plan_created=true
secure_session_bootstrap_after_path_observed=true
secure_session_path_evidence_binding_inherited=true
secure_transport_suite_binding_inherited=true
crypto_agility_extension_point_inherited=true
quantum_safe_claimed=false
secure_socket_ready_before_peer_promotion=true
normal_void_peer_auth_required_after_secure_socket=true
wrong_authenticated_node_promoted=false
relay_retirement_before_normal_void_peer_auth=false
relay_retirement_after_expected_void_peer_auth=true
direct_failure_preserves_relay=true
bidirectional_secure_socket_bytes=true
runtime_node_core_mount_performed=false
verified_direct_cache_mutation_performed=false
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

The focused proof creates real authenticated rendezvous tickets and signed probes, derives stable observations through `VoidUdpRendezvousStateV1`, verifies their provenance through live state, rejects a forged detached observation, executes the complete #1086 secure-session bootstrap, exchanges bidirectional secure socket bytes, and proves normal VOID peer authentication remains the only relay-retirement gate.

## Authority boundary

Source, proof, documentation, CI, ordinary non-force branch publication, and draft PR metadata only.

No merge, `node_core.ts` mutation, production UDP activation, production identity-key access, peer promotion, relay removal, verified-direct-cache mutation, deployment, restart, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement.

Refs #1005, #1079, #1080, #1082, #1083, #1084, #1086, #1075.

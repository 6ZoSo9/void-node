# VOID P2P UDP swarm upgrade orchestrator v1

Status: source-only convergence of authenticated UDP rendezvous, bounded hole punching, secure-session bootstrap, and relay-preserving promotion policy.

## Purpose

The lower UDP stack now proves the individual pieces needed for zero-router-config peer connectivity:

- authenticated rendezvous mapping;
- bounded UDP hole punching with OS-selected participant ports;
- mutual Ed25519 path authentication;
- signed ephemeral X25519 key agreement;
- AES-256-GCM protected reliable delivery; and
- a socket-shaped byte stream for the normal VOID peer framer.

This lane composes those pieces into one upgrade lifecycle without modifying `src/node_core.ts`.

## Product path

```text
authenticated relay/control path
        |
        v
stable authenticated rendezvous observations
        |
        v
bounded simultaneous UDP punch plan
        |
        v
direct datagram path observed
        |
        v
mutual Ed25519 path proof
        |
        v
signed X25519 secure-session bootstrap
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

## Rendezvous boundary

The orchestrator accepts only observations that:

- belong to the exact expected cryptographic node ID;
- have at least two accepted probes under the ticket;
- are stable at one endpoint within that rendezvous;
- are not marked mapping-conflicted; and
- carry bounded timestamps and a valid ticket identifier.

A rendezvous-observed endpoint remains a transport hint. It never defines node identity.

This v1 requires same-rendezvous repeat stability before attempting the direct path. Cross-rendezvous stability remains a stronger confidence signal for later persistence/reachability policy and is not silently promoted by this orchestrator.

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

1. obtain authenticated rendezvous observations through an authenticated relay/control peer;
2. run the punch schedule from the same UDP socket used for mapping;
3. feed bootstrap packets into this source stack;
4. receive a ready socket-shaped adapter;
5. attach that adapter to the existing VOID `Framer`/HELLO/AUTH path with the expected remote node ID pinned; and
6. retire or demote the relay only after that normal peer authentication succeeds.

The existing TCP direct-upgrade PR may remain an optional transport experiment, but it is not required for the UDP zero-config path proven here.

## Proof marker

```text
VOID_P2P_UDP_SWARM_UPGRADE_V1_PROOF_GREEN
authenticated_rendezvous_observations_consumed=true
stable_same_rendezvous_mapping_required=true
mapping_conflict_accepted=false
bounded_hole_punch_plan_created=true
secure_session_bootstrap_after_path_observed=true
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

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

No merge, `node_core.ts` mutation, production UDP activation, production identity-key access, peer promotion, relay removal, verified-direct-cache mutation, deployment, restart, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement.

Refs #1005, #1079, #1080, #1082, #1083, #1084, #1086, #1075.

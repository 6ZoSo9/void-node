# VOID P2P ephemeral direct transport mount v1

Status: source-only generic runtime seam for mounting a separately authenticated transient direct transport into the existing VOID peer framing/authentication path.

## Purpose

The UDP swarm stack now produces a secure, reliable, socket-shaped direct transport while preserving an authenticated relay path. The remaining core boundary is deliberately small: hand that socket to the existing VOID peer layer without allowing a punched transport hint to become durable direct-reachability truth.

This lane adds that generic mount seam. It does not implement rendezvous, UDP sockets, punching, relay control, or secure-session bootstrap inside `src/node_core.ts`.

## Mount contract

`Node.attachEphemeralDirectTransportV1(socket, expectedNodeId, transportHint)` accepts the same structural socket subset already consumed by the peer layer:

```text
on("data")
on("close")
on("error")
write(bytes|string)
destroy(error?)
writableLength (optional)
```

The mount:

- requires one exact 32-hex expected remote VOID node ID;
- rejects self identity;
- accepts only a bounded non-whitespace transport hint;
- attaches as a direct transport candidate;
- pins `expectedNodeId` before any HELLO/AUTH is accepted; and
- sends the normal existing VOID HELLO immediately through the mounted transport.

There is no alternate peer-authentication protocol in this lane. The existing `Framer`, `normalizeVoidPeerHelloV1`, `buildVoidPeerAuthV1`, `verifyVoidPeerAuthV1`, and `finishAuthenticatedPeer` remain the identity boundary.

## Ephemeral evidence boundary

A direct punched path proves that the current transport can reach and authenticate the expected node. It does **not** prove that the peer's signed TCP listen addresses are directly reachable from this node.

Ephemeral direct peers therefore carry:

```text
persistDirectEvidence=false
suppressReconnect=true
```

While that flag is false, normal authentication is allowed but these durable side effects are suppressed:

- verified-peer-cache writes;
- `knownAddrs` promotion;
- inferred peer HTTP reachability from signed listen addresses;
- outbound/direct reachability observations;
- verified-peer reconnect/backoff scheduling; and
- re-advertisement of the peer's signed listen addresses through the direct `PEERS` evidence path.

Ordinary proven direct TCP peers keep the existing default `persistDirectEvidence=true` behavior.

## Identity mismatch boundary

If the normal authenticated node ID differs from the mount's expected node ID, the ephemeral transport is rejected with a dedicated `VOID_P2P_EPHEMERAL_DIRECT_IDENTITY_MISMATCH_V1` diagnostic.

A secure UDP session, relay observation, public endpoint, hostname, certificate, port, or punch result cannot override the expected cryptographic node ID.

## Relay relationship

This seam does not retire relays. The UDP swarm orchestrator remains responsible for keeping relay continuity until this mounted socket completes normal VOID authentication for the exact expected node.

Only after that successful normal peer authentication may the higher-level orchestrator consider relay retirement or demotion.

## Focused proof

The proof builds two real `Node` instances and two actual `VoidUdpSecureSessionBootstrapV1` controllers. After the secure UDP adapters become ready, both adapters are mounted through `attachEphemeralDirectTransportV1`.

The proof requires:

- normal VOID HELLO/AUTH to complete over the secure adapter;
- exact expected peer node IDs to become the authenticated peer-map keys;
- `persistDirectEvidence=false` and reconnect suppression on both peers;
- no verified-peer-cache persistence call;
- no verified cache records;
- no `knownAddrs` or peer-HTTP promotion;
- no reachability promotion;
- no reconnect backoff after the ephemeral transport closes; and
- a separately mounted secure transport with the wrong expected node ID to fail authentication and never promote that remote peer.

Expected marker:

```text
VOID_P2P_EPHEMERAL_DIRECT_MOUNT_V1_PROOF_GREEN
ephemeral_direct_mount_surface_exposed=true
secure_udp_peer_socket_accepted=true
normal_void_hello_auth_over_ephemeral_transport=true
expected_remote_node_id_pinned=true
wrong_expected_identity_promoted=false
persist_direct_evidence=false
verified_peer_cache_write_performed=false
known_addrs_promotion_performed=false
peer_http_promotion_performed=false
reachability_promotion_performed=false
verified_peer_reconnect_scheduled=false
signed_listen_peer_advertisement_promotion=false
relay_fallback_compatibility_preserved=true
live_udp_runtime_activation_performed=false
router_configuration_required=false
port_forward_required=false
wallet_signer_validator_wc_money_authority=0
```

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

No merge, live UDP runtime activation, public rendezvous/relay activation, production identity-key access, peer promotion outside the proof fixture, relay removal, deployment, service restart, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement.

Refs #1005, #1075, #1087, #1088.

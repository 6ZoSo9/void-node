# VOID P2P UDP swarm single-socket runtime v1

## Purpose

This lane adds the first standalone runtime that performs the VOID swarm traversal sequence over **real UDP sockets** while preserving the exact outbound-first / relay-fallback product boundary.

It deliberately remains outside `src/node_core.ts`. The purpose is to prove the UDP transport mechanics independently before the Node runtime is allowed to consume them.

## One socket, one NAT mapping

Each `VoidUdpSwarmSocketRuntimeV1` owns one UDP socket for one address family.

For ordinary participant nodes, the default bind port is `0`, so the operating system chooses an ephemeral local port. The participant is not required to own a fixed public port, configure a router, or accept an unsolicited TCP connection.

The same bound UDP socket is reused for:

1. signed rendezvous mapping probes sent to the relay;
2. simultaneous peer hole-punch packets;
3. authenticated-path HELLO messages;
4. signed authenticated-path PROOF messages;
5. signed X25519 secure-key offers;
6. AES-GCM secure reliable packets.

Reusing the socket is essential. A rendezvous observation describes the NAT mapping created by that socket. Opening a different socket for the direct attempt could create a different external mapping and invalidate the relay evidence.

A public relay may explicitly bind a stable UDP endpoint such as the network's chosen relay port. That is infrastructure behavior, not an ordinary-node requirement.

## Address-family boundary

A runtime is explicitly `udp4` or `udp6`. v1 does not claim that one socket is dual-stack. A later Node mount may create independently bounded runtimes for the address families it chooses to support.

The destination endpoint must be a canonical numeric VOID UDP endpoint whose address family matches the runtime. Production-mode endpoint validation remains public-address-only. Loopback/private endpoints require the explicit proof/testing override.

## Exact observed peer endpoint

For a direct-upgrade session, every direct-session datagram is admitted only if the kernel-reported source address and source port exactly equal the peer endpoint preserved in the relay's stable rendezvous observation.

That exact-source gate is applied before punch, authenticated-path, key-exchange, or secure-packet session state is consumed.

A punch packet remains only a transport hint. It can cause the runtime to begin the secure bootstrap when the session/peer/endpoint tuple matches, but it never authenticates peer identity.

## Secure direct bootstrap

After a matching direct packet is observed, the runtime uses the existing `VoidUdpSwarmUpgradeV1` and `VoidUdpSecureSessionBootstrapV1` stack.

The runtime sends and boundedly retransmits:

- the local authenticated-path HELLO;
- the local signed path PROOF once the remote HELLO is accepted;
- the local signed X25519 key offer once mutual path proofs are accepted.

Small bounded buffers tolerate UDP reordering for a proof, key offer, or early secure packet. The existing cryptographic verifiers still decide whether the received object is acceptable.

When mutual secure bootstrap succeeds, the runtime emits a `VoidUdpPeerSocketAdapterV1` through `onDirectSocketReady`.

That socket is **not yet an authenticated VOID peer**. A later Node mount must run the normal VOID HELLO/AUTH protocol over it and require the expected remote node ID before direct peer promotion or relay retirement can be considered.

## Datagram-size boundary

The runtime enforces a hard encoded JSON datagram bound. v1 defaults to:

```text
max_datagram_bytes = 1200
secure_payload_chunk_bytes = 384
```

The lower secure payload chunk is passed into the existing reliable peer-socket adapter. Large application writes are therefore divided into multiple authenticated/encrypted secure packets before UDP transmission instead of relying on a single 16 KiB UDP payload and IP fragmentation.

The runtime fails a send whose encoded datagram exceeds its configured bound.

This is a conservative v1 transport budget, not a universal path-MTU discovery claim.

## Rendezvous receive boundary

A runtime can expose signed `VOID_UDP_MAP_PROBE` datagrams through `onRendezvousProbe`, including the kernel-observed source address and port. The runtime itself does not decide that the probe is authorized; the existing relay rendezvous coordinator verifies ticket, node identity, signature, replay budget, expiry, and mapping stability.

## Direct failure and relay fallback

Every direct attempt has the existing bounded punch timeout. Failure transitions the existing upgrade object to `direct_failed_relay_preserved` and emits a bounded failure event.

This lane exposes no API that confirms normal VOID peer authentication. Consequently the contained upgrade objects cannot become `direct_peer_authenticated`, and `relay_retirement_authorized` remains false.

The relay is not closed, demoted, or retired by this runtime.

## Proof

`scripts/prove_void_p2p_udp_swarm_single_socket_runtime_v1.ts` creates three real UDP sockets on loopback:

- participant A, with default requested bind port `0`;
- participant B, with default requested bind port `0`;
- the relay, also OS-selected for the bounded proof.

The proof uses real Ed25519 identities, the real relay rendezvous coordinator, and the real authenticated control adapter to create identity-bound tickets and accepted direct-upgrade actions.

It then proves:

- A sends two signed rendezvous probes from one actual bound UDP source port;
- B sends two signed rendezvous probes from one actual bound UDP source port;
- the relay's kernel-observed endpoints exactly equal the participants' bound proof endpoints;
- the stable coordinator observations preserve those exact endpoints;
- A and B start reciprocal direct upgrades from the accepted evidence-bearing offers;
- real hole-punch traffic arrives from the same ports the relay observed;
- authenticated-path HELLO/PROOF and signed X25519 key exchange complete over those same sockets;
- real secure UDP peer sockets become ready on both sides;
- a 4096-byte payload crosses from A to B through the secure reliable adapter;
- a reverse payload crosses from B to A;
- encrypted payload chunking uses the runtime's 384-byte secure payload limit;
- every runtime-emitted datagram remains at or below the 1200-byte encoded bound;
- a correctly shaped punch datagram sent from the wrong UDP source port is rejected before it changes the direct session;
- relay retirement remains unauthorized because normal VOID HELLO/AUTH has not run over the secure direct socket.

Expected terminal marker:

```text
VOID_P2P_UDP_SWARM_SINGLE_SOCKET_RUNTIME_V1_PROOF_GREEN
```

## Product relationship

This is the transport pattern ordinary VOID nodes need to feel like an online game rather than a self-hosted server:

```text
outbound relay connection
  -> identity-bound UDP rendezvous
  -> same-socket NAT mapping
  -> simultaneous hole punch
  -> secure direct UDP session when possible
  -> relay remains fallback
```

No manual port forwarding, public DNS, static residential public IP, UPnP, NAT-PMP, or inbound TCP requirement is introduced.

A real public-NAT success across separate residential networks is **not** claimed by this loopback proof. That requires later Node integration and external acceptance testing, including the hostile Xfinity residential case.

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR only.

This lane does **not** authorize or perform:

- merge;
- `node_core.ts` socket mounting;
- production/public UDP activation;
- normal VOID peer promotion over the direct socket;
- relay retirement;
- deployment or service restart;
- router, firewall, DNS, or interface mutation;
- wallet, signer, validator, Work Credit, transaction, broadcast, or money authority.

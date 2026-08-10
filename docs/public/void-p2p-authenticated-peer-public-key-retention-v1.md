# VOID P2P authenticated peer public-key retention v1

Status: draft source/proof lane only. No live UDP swarm activation is performed here.

## Purpose

The authenticated UDP rendezvous coordinator needs the exact Ed25519 public key belonging to each peer already authenticated by VOID. This lane retains that already-verified canonical public PEM inside the private in-memory `Peer` record so later relay/rendezvous integration can reuse the existing VOID identity proof instead of creating a second identity system.

## Authority source

`verifyVoidPeerAuthV1(...)` remains the peer identity authority. It validates the HELLO/AUTH binding, challenge values, canonical Ed25519 public key, node ID derived from that key, and signature before returning `VoidPeerAuthV1`.

`finishAuthenticatedPeer(...)` receives that verified object. Only after expected-node checks, cached-address ownership checks, and duplicate-path acceptance does it mark the peer authenticated. At that accepted point this lane stores:

```text
peer.authenticatedPublicPem = auth.pubkey
```

No new key exchange, identity claim, signature scheme, or trust source is introduced.

## Retention boundary

The retained PEM is private process memory associated with the live `Peer` object.

It is not added to `peersSnapshot()`, the verified-peer cache schema, known peer addresses, HTTP reachability state, or a new disk record. The focused proof additionally scans its temporary test data tree and requires that neither authenticated public PEM appears in files created by the test.

When the transient peer transport closes and the peer is removed from the Node peer map, the Node retains no peer-map reference carrying that PEM.

## UDP swarm relationship

The relay-side UDP swarm coordinator already requires the authenticated requester and target node IDs plus their public PEMs. A later runtime integration may pass this retained verified key into that coordinator while keeping normal VOID HELLO/AUTH as the identity authority.

This lane does not yet wire the coordinator into `node_core.ts`, allocate a live UDP socket, issue production rendezvous tickets, punch a production NAT, activate a public relay, or implement automatic relay failback.

## Zero-configuration boundary

Nothing in this lane requires router configuration, port forwarding, UPnP, NAT-PMP, public DNS, public TLS, or a stable inbound residential address. It is a prerequisite for the outbound-first swarm architecture.

## Focused proof

`scripts/prove_void_p2p_authenticated_peer_public_key_retention_v1.ts` creates two Ed25519 VOID identities and establishes the existing secure UDP peer-socket transport between two real `Node` instances. The sockets are mounted through the ephemeral-direct seam from the parent lane, and ordinary VOID HELLO/AUTH must complete.

The proof requires:

- each live private peer record retains the exact opposite peer's authenticated PEM;
- deriving a VOID node ID from that retained PEM reproduces the authenticated peer ID;
- re-import/export confirms canonical Ed25519 SPKI PEM;
- public `peersSnapshot()` contains no retained PEM field or PEM text;
- verified-peer-cache state contains no PEM;
- the temporary data tree contains no authenticated PEM bytes;
- after transport close, the peer maps contain no remaining peer object carrying the retained remote PEM.

Expected terminal marker:

```text
VOID_P2P_AUTHENTICATED_PEER_PUBLIC_KEY_RETENTION_V1_PROOF_GREEN
```

## Authority boundary

Source, proof, documentation, CI, ordinary feature-branch publication, and draft PR only.

No merge, deployment, service restart, live UDP runtime activation, public relay/rendezvous activation, production peer promotion, router/firewall/DNS/interface mutation, wallet/signer/validator/Work Credit authority, transaction action, broadcast, or fund movement is authorized by this lane.

# VOID authenticated peer identity v1

Status: source-only security foundation for issue #1042, stacked on the
IPv6-safe multipath address work in #1041.

VOID node identity is derived from an Ed25519 public key. Before this lane, the
raw TCP HELLO path accepted a claimed node ID, public key, and listen addresses
without proving possession of the corresponding private key. That is not a safe
basis for persistent reconnect state.

Protocol v2 gives every socket an independent random 32-byte challenge. HELLO
carries the node ID, canonical listen addresses, protocol version, canonical
Ed25519 public key, and challenge. AUTH signs a domain-separated transcript
containing both connection challenges, node ID, complete ordered listen-address
set, protocol version, and public key.

A peer is not assigned its real node ID and is not handshake-complete until AUTH
verifies. PEERS, SUB, and PUB traffic from an unauthenticated socket is ignored.
Unauthenticated sockets have a bounded authentication timeout and are closed.

The proof rejects replay on a fresh challenge, wrong private keys, mismatched
node IDs, modified listen addresses, malformed public keys/signatures/challenges,
and unknown HELLO/AUTH fields. The signed transcript includes bracketed IPv6.

This lane intentionally does not persist peers. Persistent peer cache and
outbound reconnect follow only after authenticated identity is exact-green.

Legacy protocol v1 peers are never silently classified as authenticated.

The #1041 multipath behavior remains required: canonical IPv4/DNS/bracketed
IPv6 addresses, independent bootstrap retries, one dead target not blocking a
healthy sibling, and malformed learned addresses rejected before dialing.

No router, firewall, interface, service, Tailnet, DNS, cloud, bootstrap
manifest, wallet, signer, validator, Work Credit, transaction, or fund mutation
is authorized or performed by this source lane.

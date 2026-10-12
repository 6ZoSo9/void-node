# VOID public P2P direct + Tor introductions v1

## Purpose

Provide a fresh public VOID node with two independently usable, cryptographically
pinned P2P introduction paths without requiring Tailscale, operator-copied
`BOOTSTRAP_ADDRS`, a commercial cloud account, router forwarding on the
secondary node, or permissive DNS learned from another peer.

The lane is active only in a public-bootstrap node child. Normal
`./run-void-node.sh` public synchronization marks that child through the
existing loopback-adapter runtime flags, so no manual environment edit is
required. The strict acceptance postures `VOID_PUBLIC_BOOTSTRAP_REQUIRE=1` and
`VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH=1` enable the same lane directly.

A local/test node with no public-bootstrap child/runtime marker does not
automatically dial these public introductions.

## Canonical introduction set

The source-reviewed introduction set is:

```text
config/void-public-p2p-bootstrap-introductions-v1.json
```

It contains exactly two independent entries:

| ID | Transport | Endpoint | Expected node ID | Failure domain |
|---|---|---|---|---|
| `precision-direct-ipv4` | direct IPv4 | `24.40.99.171:4700` | `9d89483769e469e0473b489dc50dba96` | `precision-home-wired` |
| `nimo-tor-v3-p2p` | Tor v3 P2P | `tor://6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion:4700` | `12babb04b0f88de7b74e17d04b343007` | `nimo-tor-independent-edge` |

Both paths use the normal VOID HELLO/AUTH identity protocol. A transport endpoint
that presents a different node identity is rejected.

## Tor transport boundary

The Tor P2P client uses the same loopback SOCKS configuration as the existing
Tor bootstrap transport:

```text
VOID_TOR_SOCKS_HOST
VOID_TOR_SOCKS_PORT
VOID_TOR_BOOTSTRAP_TIMEOUT_MS
```

Defaults remain `127.0.0.1:9050` with the existing bounded timeout.

SOCKS remote hostname resolution is used for the onion. The implementation
preserves any bytes coalesced after the SOCKS CONNECT response, because a VOID
HELLO may arrive in the same TCP packet.

A Tor-authenticated peer is a live cryptographically verified peer and therefore
appears in `/p2p/peers.verifiedPeers` while the authenticated session exists.
Its reported transport address is the source-reviewed `tor://...` endpoint.

The Tor endpoint is **not** written into the direct-TCP verified reconnect cache.
Ordinary direct reconnect code therefore never attempts OS DNS/TCP resolution of
an onion address. Tor reconnect remains in a separate bounded SOCKS backoff loop.

The local node advertises an empty listen set over a Tor bootstrap session. This
prevents the remote onion node from persisting the client's loopback, LAN, or
NAT-local address as direct reconnect evidence.

## Learned-peer policy

This lane does not weaken third-party peer discovery. DNS names and onion names
received through ordinary `PEERS` advertisements remain subject to the
existing learned-peer filter and are not granted bootstrap authority.

The two endpoints in this lane are permitted because they are source-reviewed
first-party introduction records paired with exact expected cryptographic node
IDs.

## N-1 behavior

The direct and Tor introductions start independently and retry independently.

The live acceptance workflow proves:

1. both introductions authenticate from an outside GitHub runner;
2. after the direct Precision path is blocked and its live socket removed, the
   Tor-authenticated Nimo peer remains connected and verified;
3. with Precision unavailable before startup, Nimo Tor still authenticates; and
4. with Tor SOCKS unavailable before startup, Precision still authenticates.

All intentional failures occur only inside disposable GitHub runners.

## Authority and cost boundary

Neither introduction grants wallet, signer, validator, treasury, Work Credit,
transaction, or money-moving authority.

The secondary introduction is the existing Nimo Tor hidden service. It requires
no Railway/VPS deployment or paid hosting service.

## Proofs

Source proof:

```bash
npx --no-install tsx scripts/prove_void_public_p2p_direct_tor_introductions_v1.ts
```

Live N-1 proof:

```text
.github/workflows/void-public-p2p-direct-tor-introductions-v1.yml
```

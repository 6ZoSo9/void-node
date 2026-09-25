# VOID public P2P bootstrap introductions v1

## Purpose

Provide a fresh public VOID node with more than one independently authenticated
P2P introduction without requiring operator-copied `BOOTSTRAP_ADDRS`, Tailscale,
or permissive DNS learned from another peer.

This lane is active only when the existing public bootstrap posture is explicit:

```text
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1
```

or when strict multipath public-bootstrap acceptance is requested.

## Canonical introductions

The source-reviewed configuration is:

```text
config/void-public-p2p-bootstrap-introductions-v1.json
```

It currently binds two independent introductions:

| ID | Address | Expected VOID node ID | Class | Failure domain |
|---|---|---|---|---|
| precision-primary | `24.40.99.171:4700` | `9d89483769e469e0473b489dc50dba96` | `direct_ipv4_seed` | `precision-home-wired` |
| railway-free-secondary | `iriguchi.proxy.rlwy.net:58979` | `4f93300760f94834139babd2b54d2619` | `relay` | `railway-free-sfo` |

Each dial supplies the expected node ID to the normal VOID HELLO/AUTH path.
A TCP endpoint that presents a different identity is rejected rather than
rebound.

## DNS boundary

This lane does **not** weaken learned-peer DNS policy.

An address learned indirectly from a `PEERS` message still has to pass
`isPublicLearnedPeerAddressV1(...)`, which rejects DNS names. The Railway DNS
endpoint is permitted only because it is explicitly source-reviewed in the
pinned bootstrap configuration and is paired with an expected authenticated
VOID node ID.

That distinction prevents an authenticated peer from steering fresh nodes to
arbitrary resolver results while still allowing a first-party TCP proxy whose
public endpoint is DNS-based.

## N-1 behavior

The two introductions are independently dialed and independently retried. One
failed endpoint does not gate the other.

A fresh node therefore has two separate introduction failure domains before it
has any durable verified-peer cache. After successful authentication, normal
verified-peer cache behavior persists the authenticated identity/address binding
for later reconnects.

The configuration declares:

```text
manual_operator_address_copy_required=false
private_tailnet_dependency=false
commercial_cloud_provider_required=false
dns_provider_required=false
tunnel_provider_required=false
single_required_introduction=false
```

`commercial_cloud_provider_required=false` means Railway is not a required
single dependency: removing the Railway introduction leaves the independent
Precision introduction, and removing Precision leaves Railway.

## Authority boundary

This lane grants no wallet, signer, validator, treasury, Work Credit, transaction,
or money-movement authority. The Railway introducer carries only a dedicated
Ed25519 P2P identity and no Chain-2050 state.

## Proofs

Source proof:

```bash
npx --no-install tsx scripts/prove_void_public_p2p_bootstrap_introductions_v1.ts
```

The live N-1 workflow additionally proves from a GitHub-hosted outside machine
that a fresh public node authenticates both pinned identities, then remains
healthy with one introduction unavailable at a time.

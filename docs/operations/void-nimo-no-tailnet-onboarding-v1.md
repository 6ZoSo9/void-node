# VOID Nimo no-Tailnet onboarding v1

Status: source-only preparation and acceptance harness. This document does not activate a public seed, alter DNS/firewall/router state, restart a node, or publish a bootstrap manifest.

## Goal

Use the freshly reinstalled Nimo machine as a real outside-Tailnet acceptance node for VOID Mainnet-0.

The acceptance target is intentionally stricter than the old operator mesh:

- no Tailscale executable on the acceptance machine;
- no `tailscaled` process;
- no `tailscale0` interface;
- no local `100.64.0.0/10` address;
- no private `100.x` bootstrap/follower origin in the process environment;
- no manually copied operator `BOOTSTRAP_ADDRS`;
- canonical public bootstrap only;
- nonzero synchronized Chain-2050 head;
- `ready=true`, `gap=0`, and `txroot_live=1`;
- at least one connected P2P peer and one verified P2P peer after synchronization.

This proves that a fresh VOID participant can join without Tailnet admission. It does not by itself close the broader N-1 multipath requirements of issue #1005.

## Current truth before activation

At the time this source lane is prepared, the current canonical manifest remains `hold_no_stable_seed` and publishes zero HTTPS synchronization endpoints.

That is a deliberate HOLD. The acceptance harness must not reinterpret the hold as success and must not fall back to a private Tailnet endpoint.

Before Nimo can pass the real preflight, the operator side still needs:

1. one real stable restricted HTTPS seed that passes the existing public-seed qualification contract;
2. publication of the exact qualified manifest generation through the reviewed manifest-publication boundary; and
3. a public P2P introduction path that lets Nimo acquire at least one connected and verified peer without a private `100.x` address.

The restricted synchronization gateway must expose only the existing read contract. Do not expose the full node HTTP listener to the public Internet.

## Fresh Nimo acceptance sequence

Start from a fresh Linux install with ordinary Internet access. Do not install or configure Tailscale for this acceptance run.

Clone the canonical repository:

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
```

Run the fail-closed no-Tailnet preflight:

```bash
node tools/void-nimo-no-tailnet-acceptance-v1.mjs --preflight
```

While the canonical manifest is still a hold, the command must terminate with:

```text
VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_HOLD: stable public HTTPS seed is not published
```

After a real stable manifest is published and remains live-qualified, the same command must emit:

```text
VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN
```

Then start VOID through the ordinary public-bootstrap path:

```bash
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 ./run-void-node.sh
```

Do not set `BOOTSTRAP_ADDRS` manually. Do not set `VOID_FOLLOWER_AUTOSTART_PEERS` to a private operator address. Do not add a `100.x` origin to make the test pass.

Once the node reports synchronized readiness, run from a second terminal in the same clean repository:

```bash
node tools/void-nimo-no-tailnet-acceptance-v1.mjs --post-sync
```

A complete acceptance emits:

```text
VOID_NIMO_NO_TAILNET_POST_SYNC_V1_GREEN
tailnet_required=false
private_configuration_required=false
gap=0
txroot_live=1
```

The tool also requires a positive head, at least one connected peer, and at least one verified peer.

## Why HTTPS sync and P2P are separate gates

Current Mainnet-0 follower catch-up acquires complete canonical blocks through bounded HTTP(S) pulls. Native P2P supplies authenticated peer identity, peer exchange, reconnect, relay/direct-upgrade foundations, and long-term mesh connectivity, but P2P announcements alone are not a replacement for the current full-block follower transport.

Therefore a truthful no-Tailscale acceptance must prove both:

- public restricted synchronization; and
- public authenticated peer connectivity.

A test that proves only one of those two is incomplete.

## NAT boundary

The fresh Nimo participant must not require inbound router configuration merely to join. Outbound-first P2P, relay reservations, and authenticated UDP direct-upgrade/hole-punch source exist as separate networking layers. They remain bounded opt-in mechanisms and are not silently enabled by this harness.

The first no-Tailnet acceptance should use a stable public introduction that is already reachable from an ordinary network. NAT direct-upgrade can then be exercised as a separate resilience proof.

## Safety boundary

This lane has no authority to:

- activate or publish a public seed;
- change `public/bootstrap/v1.json`;
- alter DNS, TLS, router, firewall, interface, or service state;
- install Tailscale;
- restart Precision, Alienware, or Nimo;
- expose private/operator mutation routes;
- read credentials or private keys;
- access wallets or signers;
- mutate validators or Work Credits;
- submit transactions; or
- move funds.

The harness itself is observational. The separately invoked ordinary `run-void-node.sh` startup remains an explicit operator action on the fresh Nimo machine.

## Definition of done for Nimo

Nimo is ready to serve as the no-Tailscale acceptance machine only when all of these are simultaneously true:

```text
fresh_install=true
tailscale_binary_present=false
tailscaled_process_present=false
tailscale_interface_present=false
tailnet_address_present=false
private_100x_bootstrap_present=false
stable_public_https_seed_required=true
public_bootstrap_resolver_green=true
head>0
ready=true
gap=0
txroot_live=1
connected_peer_count>=1
verified_peer_count>=1
tailnet_required=false
private_configuration_required=false
```

The current hold manifest means this operational definition of done is not yet met. That is the exact condition the next stable-seed activation lane must close.

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
- matching positive safe-integer readiness/latest heads at or above the exact resolver-admitted manifest target;
- three target observations, separated by one-second waits, with the same local manifest bytes;
- `ready=true`, `gap=0`, and `txroot_live=1`;
- at least one connected P2P peer and one verified P2P peer after synchronization.

This checker observes machine and HTTP snapshots. It does not establish a fresh synchronization session, the running node's source/configuration identity, public P2P provenance, or complete #1005 onboarding. Those independent review gates remain open.

## Current source and public-bootstrap truth

This repair integrates current main `def5539492dd9e5ad187f919cf827babff1afe95`.
The reviewed #1479 renewal publishes one stable HTTPS seed with qualified head
`1951058` and manifest expiry `2026-09-12T16:22:01.110Z`. Freshness is still checked
at execution; these recorded coordinates do not extend any deadline or prove
current seed availability. A hold or expired manifest must remain a HOLD.

The original checker could accept local head `196802` against qualified target
`1951058` while local readiness, gap, txroot and peer snapshots were green.
The actual predecessor CLI is retained as a hash-pinned falsifier in the proof.
The successor computes the maximum qualified head from all accepted enabled
endpoints, requires canonical integer targets, and checks the local manifest's
content ID against the canonical resolver's single successful verify identity.

Before and after three complete observations it verifies the same content ID
through the resolver. Bounded regular-file reads retain the exact local manifest
SHA-256; each observation rechecks those bytes and expiry. A changed manifest,
resolver generation, expired target, malformed/missing readiness head, unequal
readiness/latest heads, or any sample below target returns HOLD before success.
The local file read is capped at 1 MiB and 64 reads; each resolver subprocess has
a 60-second deadline. These are cooperative observations, not an atomic snapshot
or hostile namespace custody. An unobserved change-and-restore is not excluded.

This closes only the target-observation source seam. Public authenticated P2P
introduction, fresh-state/session provenance, the actual node's runtime/config
and follower-range identity, continuous no-Tailnet evidence, strict bounded HTTP
admission and real-node orchestration remain separate open requirements. The
restricted synchronization gateway must expose only its existing read contract.

## Future operator sequence after independent acceptance

The PR remains Draft; these are future operator instructions, not a request to start a node now.

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

Successful target observations emit:

```text
VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN
tailnet_required=false
private_configuration_required=false
gap=0
txroot_live=1
```

The tool reports `bootstrap_manifest_id`, raw local `bootstrap_manifest_sha256`,
`qualified_target_head`, all three `observed_heads`, and snapshot peer counts.
Both readiness and latest heads must be actual positive safe-integer JSON numbers,
exactly equal within each sample and at least the retained target. A later sample
below target fails even if the first sample passed. The old POST_SYNC success
marker is retired because these snapshots cannot certify the whole join.

Every successful target observation also states:

```text
runtime_session_bound=false
fresh_join_proven=false
public_onboarding_accepted=false
```

The focused proof executes both exact predecessor and current CLI orchestration
inside Node VM modules, with process/filesystem/resolver/HTTP boundaries simulated.
It reproduces the historical false green and runs 40 current CLI cases, including
all three observations, changed/re-pinned manifest content, missing/duplicate/
mixed resolver IDs, end-of-interval expiry and the maximum multi-seed target.
No test starts a node or makes a real network request. Node 22/24/26 execute this
wall on the exact candidate integrated with current main. Workflow triggers cover
the target checker, canonical resolver, seed helpers, manifest and engine inputs;
this does not close the separate real-node/P2P dependency-orchestration gate.

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
ready.head=latest.head>=qualified_target_head
target_observation_count=3
ready=true
gap=0
txroot_live=1
connected_peer_count>=1
verified_peer_count>=1
tailnet_required=false
private_configuration_required=false
```

The renewed manifest removes the old no-stable-seed prerequisite only. This operational definition of done still requires separately captured Nimo/session/public-P2P evidence and independent acceptance; the target-observation marker cannot supply it.

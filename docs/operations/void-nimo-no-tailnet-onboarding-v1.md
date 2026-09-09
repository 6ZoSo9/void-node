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
- at least one structurally valid connected peer whose identity also appears in the verified-peer cache snapshot.

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

The source repairs cover target observations, bounded HTTP acquisition and peer-record admission. Public authenticated P2P
introduction, fresh-state/session provenance, the actual node's runtime/config
and follower-range identity, continuous no-Tailnet evidence and real-node orchestration
remain separate open requirements. The
restricted synchronization gateway must expose only its existing read contract.

## Bounded HTTP evidence acquisition

The former reader called `arrayBuffer()` before checking its 2 MiB ceiling. The
proof executes that exact predecessor and observes 2,097,153 bytes retained before
HOLD. Rejection after whole-body buffering did not enforce an acquisition limit.

The current reader admits only unredirected HTTP 200 JSON responses. It requires
`application/json` with an optional UTF-8 charset, identity or absent content
encoding, and an absent or canonical positive decimal content length no larger
than 2,097,152 bytes. Declared oversize, malformed length, compressed bodies and
conflicting/unsupported transfer framing are rejected before acquiring a reader.
An undeclared length is allowed; chunked transfer must not also declare a length.

One fixed 2 MiB retention buffer replaces whole-body buffering. Each byte chunk
is counted before copying; the first chunk exceeding the remaining capacity or
declared length causes HOLD without another read. At most 1,024 read calls,
including EOF, are permitted, so endless empty or tiny chunks cannot run forever.
EOF and an exact declared-length match are required. Invalid UTF-8, a JSON BOM,
empty/truncated bodies and invalid JSON syntax return HOLD.

A monotonic 10-second total request deadline covers headers and all body reads;
it is not renewed for each chunk and cannot be extended by wall-clock rollback.
Pending headers/reads race that deadline independently of cooperative abort.
Every owned response is aborted on retirement; failures cancel the body/reader
with a separate 250 ms cleanup allowance and release any acquired reader lock.
Cancellation rejection, exceptions or a cancellation promise that never settles
cannot convert rejection into success or leave the CLI awaiting cleanup forever.

The byte ceiling describes the reader's retained body buffer. It is not a bound
on fetch/socket buffers, an incoming chunk allocated by the transport, decoded
strings, parsed objects, total process RSS or operating-system scheduling. The
peer identity authentication and local runtime/session authority HOLDS are not
closed by successful HTTP acquisition.

## Peer snapshot admission

The old checker counted any nonempty peer arrays. Its exact predecessor can
report one connected and one verified peer for `ok:false`, `connected:[null]`,
and `verifiedPeers:[false]`. The focused CLI proof reproduces that false success.

Admission now requires literal `ok === true` and checks every counted record
before returning any counts. A malformed entry invalidates the entire sample,
including mixed arrays containing both valid and invalid records. Counted records
must be plain objects with exactly these fields:

| Record | Required fields |
| --- | --- |
| Connected | `id`: exactly 32 lowercase hex characters; `addr`: bounded nonempty string; `listens`: 0–32 unique bounded address strings; `outbound`: boolean |
| Verified cache | `node_id`: exactly 32 lowercase hex characters; `addresses`: 1–8 unique bounded address strings; `last_authenticated_at_ms`: nonnegative safe-integer JSON number |

Address text is limited to 512 characters and excludes whitespace/control
characters. This structural check permits direct and relay transport labels; it
does not parse a new address protocol, resolve names, prove public routability,
or authenticate an endpoint. Timestamp validation checks representation, not a
new handshake or cache freshness. Uncounted `knownAddrs` metadata grants no peer
acceptance authority.

Each sample admits at most 4,096 connected records and 128 verified-cache records.
Duplicate identities within either list and ambiguous address ownership across
verified records cause HOLD. At least one connected identity must match a
verified-cache identity. `connected_peer_count` and `verified_peer_count` report
their distinct list counts; `verified_connected_peer_count` reports the identity
intersection and must remain positive in all three observations. A cached record
for an unrelated disconnected peer cannot satisfy this condition.

The proof executes the unchanged pure `Node.peersSnapshot()` projection against
fixture state and checks the route's success-envelope source. It compares five
producer/contract files with their exact HEAD Git bytes and emits their blob and
SHA-256 identities. Both workflow triggers now include those five inputs. This
is projection/schema evidence only: no Node constructor, HTTP route server,
socket or authentication handshake runs, and complete runtime/P2P dependency
orchestration remains unproven.

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
Peer counts require validated records and a positive connected/cache identity intersection.
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
It separately runs 55 HTTP admission cases: 48 HOLD adversaries and seven
target-observation-only controls. Those cases measure reads, body copies,
cancellation, lock release and timer retirement through the actual CLI. They
cover exact byte/read ceilings, first-byte overflow, declared-length mismatch,
malformed framing/encoding, split UTF-8 codepoints, stalled headers/body/cleanup,
late headers and wall-clock rollback. The deadline tests advance a virtual
monotonic clock while checking the real requested timer values; they do not
claim measured wall-clock network performance. Both exact predecessor sources
are independently hash-pinned in the proof.
The peer schema adds 121 CLI cases: 114 HOLD adversaries and seven bounded
observation controls. These cover malformed/mixed rows, missing/extra fields,
numeric and identity type errors, duplicate identities/addresses, disjoint
connected/cache lists, exact count ceilings, later-sample failures, valid inbound
and relay records, and the actual producer's exclusion of unidentified peers.
Its exact predecessor CLI is separately hash-pinned and reproduces the malformed
peer false green. The target and HTTP populations remain 40 and 55 respectively.
No test starts a node or makes a real network request. Node 22/24/26 execute this
wall on the exact candidate integrated with current main. Workflow triggers cover
the target checker, canonical resolver, seed helpers, manifest, engine inputs and
the five peer producer/contract sources;
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
verified_connected_peer_count>=1
tailnet_required=false
private_configuration_required=false
```

The renewed manifest removes the old no-stable-seed prerequisite only. This operational definition of done still requires separately captured Nimo/session/public-P2P evidence and independent acceptance; the target-observation marker cannot supply it.

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

The source repairs cover target observations, bounded HTTP acquisition,
peer-record admission, canonical local HTTP origin admission and rejection of
known manual address inputs in the checker environment. Public authenticated P2P
introduction, fresh-state/session provenance, the actual node's runtime/config
and follower-range identity, continuous no-Tailnet evidence and real-node orchestration
remain separate open requirements. The
restricted synchronization gateway must expose only its existing read contract.

## Manual address inputs

The checker previously rejected manual addresses only when their text contained
Tailnet markers. Its exact predecessor accepts LAN and ordinary public operator
addresses in both CLI modes, including the legacy bootstrap and singular
follower aliases. The checker now requires these 12 known steering keys to be
absent from its own input environment:

| Input seam | Keys |
| --- | --- |
| P2P bootstrap | `BOOTSTRAP_ADDRS`, `BOOTSTRAP` |
| Follower origins and legacy authorization | `VOID_FOLLOWER_AUTOSTART_PEERS`, `VOID_FOLLOWER_AUTOSTART_PEER`, `VOID_FOLLOWER_LEGACY_V2FS_ORIGINS` |
| Main/drift origins | `VOID_MAIN_BASE`, `VOID_DRIFT_PEER` |
| Seed-client inputs | `VOID_PUBLIC_SEED_CLIENT_PEERS`, `VOID_TOR_PUBLIC_SEED_CLIENT_PEERS` |
| Site/DataNet peer inputs | `VOID_SITE_BUNDLE_PEERS`, `VOID_DATANET_SITE_BUNDLE_PEERS`, `VOID_DATANET_PEERS` |

Presence causes HOLD even for empty or whitespace-only values. The checker does
not read, parse or log the address values and does not remove or rewrite them.
Initial rejection happens before any child process, manifest read, resolver call
or HTTP request. The guard runs again before each resolver/HTTP call and at the
terminal checks. A later observed override requires a new complete pass.

Caller-supplied adapter flags cannot authorize a follower override. The ordinary
startup supervisor legitimately creates follower configuration inside its child
node after bootstrap resolution; this checker does not inspect or reject that
child's environment. Run it from the separate terminal described below. The
normal `VOID_PUBLIC_BOOTSTRAP_REQUIRE=1` requirement remains allowed.

This is an input-policy repair, not proof of the running node's effective
configuration. The checker does not inspect `.env`, service configuration,
cached introductions, every discovery path, or transient state between checks.
A clean checker shell cannot prove the node was started clean. Binding the
actual node configuration and the full startup/synchronization interval remains
an open requirement.

The proof binds seven consumer/startup sources to their HEAD Git bytes and adds
missing workflow triggers. It executes only the real follower origin-selection
function with its three TypeScript annotations erased, confirming that both
plural and singular keys can select the supplied origin. It does not register
routes, start a follower, load node configuration or execute node startup.

## Canonical local HTTP origin

Both CLI modes admit only the exact origin `http://127.0.0.1:4100`, matching the
ordinary startup script's default HTTP port. `VOID_NIMO_LOCAL_HTTP_BASE` may be
absent or contain that exact string. All other spellings return HOLD before any
child process, resolver call, manifest read or HTTP request. This includes empty
overrides, a trailing slash, alternate ports, URL paths/query/fragment/userinfo,
DNS names, numeric address aliases, IPv6 and remote or private-network hosts.
Custom HTTP ports, including 4101, are outside this fixed acceptance profile.

`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` and their lowercase counterparts must
also be absent, even if empty or paired with `NO_PROXY`. Only key presence is
checked; proxy values are never read, copied or printed. A bypass list alone
does not supply a proxy and is allowed. The checker does not change environment
or network configuration. Rejection messages never echo the supplied URL.

The proof reproduces the exact predecessor's observation success from a
simulated foreign HTTPS responder supplying otherwise valid JSON at all four
routes. The successor rejects that origin before I/O. It also binds the profile
to the committed `run-void-node.sh` default and makes that source a workflow
trigger; it does not execute startup or load the node's environment.

This closes caller-selected URL origins and conventional environment proxy
steering within the normal checker process. It does not authenticate the
listener on port 4100, bind a PID/socket/source/configuration, exclude a replaced
fetch dispatcher or host-level routing interference, or prove one uninterrupted
node generation across the samples. A synthetic process on the admitted port
can still supply structurally valid snapshots. Successful output therefore
includes the admitted `local_http_base` and `local_http_process_bound=false`;
runtime/session/public-onboarding acceptance remains false.

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

### Supervised checker execution prerequisite

Darwin's fetch-dispatcher recovery experiment V2 binds predecessor
`a5da50fd047351b2bd40e5dc2a736feedb3a6f2a`. A preload can replace `fetch`, erase
its own environment/argv indicators, and fabricate all 12 responses. Destination
validation inside that process cannot independently establish execution identity.

The new `prove_void_nimo_execution_session_v1.mjs` is an independent supervisor
for a disposable experiment. It imports no checker validation code. It owns the
exclusive `127.0.0.1:4100` listener, retains the child process object, fingerprints
the actual Node executable and committed source inputs, and externally reads
its own child's procfs startup arguments, closed environment, executable, working
directory and PID/start-time identity before releasing checker execution. Those
fields are checked again before every response. No unrelated process environment
or inherited operator/credential environment is read.
The Linux procfs view must expose the supervisor's PID namespace; a mismatched
container view returns HOLD before creating a listener or child.

The controlled child executes the unchanged checker entry through VM modules.
Only Git, machine, manifest and resolver I/O are simulated; fetch and timers run
in the actual Node process. This is an explicit fixture boundary, not proof that
the simulated repository lease or public resolver ran against a live network.
The current checker source is unchanged by this execution experiment.

Each actual Node 22/24/26 runtime executes 17 checker-fixture children:

| Population per runtime | Children | Expected result |
| --- | --- | --- |
| Four historical preload controls | 4 | Four false greens, 48 forged results, zero TCP connections |
| Nominal admission | 1 | 12 observed loopback requests |
| Four attacked admission attempts | 4 | HOLD before checker entry, zero requests |
| Kills after requests 1, 4, 8 and 11 | 4 | No admissible success; 24 total prefix requests |
| Fresh mates after those kills | 4 | 48 requests from fresh process instances |

The four forms are `NODE_OPTIONS --require`, `NODE_OPTIONS --import`, argv
`--require` and argv `--import`. Attack fixtures run during admission attempts,
but the external parent refuses to release the checker when their actual startup
envelope differs from the closed nominal vector. The historical controls
deliberately bypass that admission rule to demonstrate the existing defect.
This bypass is confined to the experiment; it is not an operator acceptance API.

The complete matrix has exactly 51 checker-fixture children, 12 historical false
greens, 144 forged results and 252 kernel-loopback requests: 36 nominal, 72 killed
prefixes and 144 fresh reconstructions. Git source-inspection subprocesses and
separate verifier jobs are outside the checker-child population. No VOID node,
public seed, P2P handshake or non-loopback network request runs in this experiment.

The parent requires exact route order, response bytes and the complete expected
stdout derived from those bodies. Each request uses one connection and each
response closes it. A kill occurs after the named request arrives and before its
response is released; that transcript entry has a null response. A success marker
without all 12 requests supplies no admission authority.

Bounds are 64 fixed 100 ms supervisor ticks per child, 12 connections/requests,
8 KiB and 16 reads per request header, 8 KiB each for stdout/stderr, and 256 KiB
per canonical runtime receipt. The parent caps each procfs input at 16 KiB (stat
at 4 KiB) and 64 reads, and hashes the Node executable through 64 KiB chunks with
a 256 MiB file ceiling. These are cooperative application bounds, not strict RSS,
kernel-buffer, hostile scheduling, same-UID custody or dynamic-linker isolation.

The parent publishes one create-only receipt after all 17 members pass. Killed
members carry no admission edge; every fresh mate starts again without loading
crash residue. The independent verifier checks exact source/generation/runtime
membership, all transcripts and terminal output, and 22 structural adversaries.
The aggregate requires exactly one Node 22, 24 and 26 receipt from the same
workflow run/attempt, then publishes one create-only aggregate. A partial rerun
cannot silently combine historical and current attempts.

Receipt hashes are integrity identities, not signatures. The verifier cannot
authenticate an entirely fabricated but self-consistent document; accepted
evidence must retain the supervisor/workflow artifact provenance. Parent startup
is trusted by this cooperative CI profile. Reading the parent's own environment
would not authenticate a parent already replaced by a hostile loader.

`FETCH_DISPATCHER_EXECUTION_RECOVERY_GREEN` proves only this controlled execution
and recovery experiment. It retains `void_node_started=false`,
`runtime_configuration_bound=false` and `public_onboarding_accepted=false`.
Actual node startup integration, compiled-source/configuration identity, listener
ownership, fresh-state/public-P2P evidence and the full no-Tailnet synchronization
interval remain open. The existing startup supervisor overlaps active #1458 and
is unchanged by this prerequisite.

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
local_http_process_bound=false
fresh_join_proven=false
public_onboarding_accepted=false
```

The focused proof executes exact historical predecessors and current CLI orchestration
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
Origin admission adds 49 CLI cases: 45 HOLDs, three observation-only controls and
one preflight-only control. Every rejected case checks zero HTTP requests,
resolver calls, manifest opens, child processes and body/timer allocations.
Proxy accessor traps prove that key-presence rejection does not read values,
including when bypass lists are present. Its fourth independently hash-pinned
predecessor reproduces the foreign-responder false green. The total is 265
current CLI cases before the manual-input population; process/session identity
remains unproven.
Manual-input admission adds 92 CLI cases: 90 HOLDs and one control for each CLI
mode, bringing the total to 357 cases per runtime. A fifth hash-pinned
predecessor reproduces five manual-address bypasses in both modes (10 false
greens). The successor covers all 12 keys, empty/whitespace/private/public/
Tailnet values, value-read traps, aliases, a forged adapter flag and overrides
introduced during resolver or HTTP observations. Canonical requirement controls
preserve the caller environment and false runtime/session/onboarding authority.
No test starts a node or makes a real network request. Node 22/24/26 execute this
wall on the exact candidate integrated with current main. Workflow triggers cover
the target checker, canonical resolver, seed helpers, manifest, engine inputs and
the five peer producer/contract sources, seven manual-input consumer/startup
sources and ordinary startup script;
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
# HTTPS supervisor node-process observation integration

The HTTPS supervisor has an optional diagnostic selected by
`VOID_NIMO_NODE_PROCESS_OBSERVATION_V1=1`. Absent or `0` preserves the normal
startup path without loading the diagnostic. This source change is not an
operator launch instruction or a deployment. Tor and multipath integration
remain separate work.

The diagnostic is prepared before the existing direct-child spawn and observes
that exact child. It leaves checkpoint selection, data-directory authority,
inherited descriptors and the existing historical HMAC channel alone. It
records the Node executable, node-entry bytes, PID/parent/start ticks, network
namespace, and a small public subset of launch configuration. Preparation
rejects loader environment keys and an HTTP port other than 4100. It never
reads `.env`, keys, `/proc/<pid>/environ`, other processes' configuration, or
descriptor contents/file-path targets.

After startup it waits up to 120 readiness attempts for the qualified target,
then runs the same three-sample target/peer validator used by the ordinary CLI.
The parent uses native HTTP rather than mutable global fetch. Before sending a
request it matches the accepted connection's exact tuple and socket inode to a
socket descriptor owned by its node child. The child must also own one matching
listener. The listener inode remains fixed across the observation; ownership,
process identity, selected parent launch settings, source files, entry bytes and
manifest are rechecked through body terminal and the final observation.

Each HTTP operation has a ten-second deadline, 16 KiB headers, a 2 MiB body and
1,024 body reads. The diagnostic requires status 200, length-framed UTF-8 JSON and
a connection held open through terminal ownership verification. Chunked or
closing connections HOLD in this narrow profile. Procfs input and descriptor
enumeration are bounded; unreadable or excessive state HOLDs. The complete
diagnostic has a 180-second deadline and a 132-response ceiling. These are
application limits, not hard real-time kernel scheduling guarantees.

Child exit/error, adapter closure or supervisor shutdown invalidates the
diagnostic. A failed diagnostic emits a fixed HOLD and does not kill, restart or
reconfigure the node. Its context cannot be reused for a replacement process.

| Receipt claim | Meaning |
| --- | --- |
| `child_process_and_socket_bound=true` | These response connections belong to this directly spawned process and listener generation under the cooperative kernel profile. |
| `node_entry_bytes_bound=true` | The named entry file's bytes stayed equal; this does not establish their build derivation. |
| `selected_launch_configuration_bound=true` | HTTP port, derived adapter origins and selected follower numeric settings were retained at the parent boundary. |
| `compiled_source_derivation_bound=false` | No complete compiled-module closure/build attestation was admitted. |
| `runtime_configuration_bound=false` | Effective node configuration and all discovery/follower inputs were not attested. |
| `runtime_session_bound=false` | A complete fresh synchronization session and its provenance were not established. |
| `public_onboarding_accepted=false` | No external Nimo acceptance is inferred. |

The JSON result is a snapshot from the owning supervisor, not a reusable
authorization credential. Its hashes are not signatures. This profile trusts
parent startup and the host kernel; it does not exclude hostile same-UID FD
sharing, dynamic-linker manipulation or privileged namespace changes. Continuous
no-Tailnet routing, authenticated public peer provenance, fresh-state custody and
the node's effective follower/synchronization identity remain open gates.

The focused proof separately exercises disposable HTTP child processes, including
foreign listeners, same-PID listener rebinding, child exit, entry/configuration
changes, invalidation, malformed responses and a fresh successful reconstruction.
It also executes the actual supervisor source with controlled process/adapter
boundaries to check default-off behavior, prepare-before-spawn ordering and
failure isolation. This is separate from the existing 51-child dispatcher
experiment. No actual VOID node, key, data directory or public seed is opened.

Coordination: PR #1458 at `b4702aaeaa51f76df06e9381209e0b209b8151a6`
also edits the HTTPS supervisor for checkpoint restore. This ordinary source
overlap is Amber. The observation hooks are outside checkpoint preparation and
child environment/stdio construction; a combined-source reconciliation check is
required before merge. No checkpoint or chain-storage implementation is copied
or modified by this lane.


# Cooperative recovery after abrupt HTTPS supervisor loss

Darwin review `5160271536` binds predecessor
`c24d0d8bbc4b50ced616b697fe2dbade8f0f0117`. Clearing the child's bootstrap
HMAC after IPC disconnect does not release its HTTP/P2P listeners or data
handles. A supervisor killed by SIGKILL cannot run its signal cleanup handler.

The HTTPS supervisor now starts its direct Node child through
`run_void_public_bootstrap_child_v1.mjs`. That wrapper registers exit on IPC
disconnect before importing the configured node entry. It exits with code 76
when its parent disappears. This applies to normal HTTPS startup, including
when the optional observation diagnostic is disabled. The diagnostic checks the
kernel wrapper/entry argv and binds wrapper bytes alongside its other sources.
In-process argv keeps the direct-entry convention. The existing child environment,
stdio, authority exchange and checkpoint boundary remain unchanged.

This is cooperative event-loop lifetime coupling. A child blocked in native
code or deliberately removing listeners requires a separately verified kernel
or service-manager lifetime contract. No such designated-host guarantee is
inferred. Tor and multipath startup are outside this change.

The focused workflow has a separate Node 22/24/26 recovery matrix. Each runtime
executes twelve controller processes and one byte-first verifier: six exact
predecessor schedules and six successor schedules. Each schedule starts G1,
kills its supervisor with SIGKILL and launches G2 exactly once. Across three
runtimes this is **36 schedules, 72 parent generations, 72 child generations
and 39 top-level harness executions**. Syntax/Git plumbing, existing CLI tests,
the 51-child dispatcher experiment and the 18-case observation proof are
separate populations.

| Cut | External scheduling observation |
| --- | --- |
| 1 | Authority-ready received; authority delivery held |
| 2 | Authority delivered; first HTTP request held |
| 3 | Actual observer has checked listener/accepted socket ownership |
| 4 | First complete owned HTTP response |
| 5 | Fifth complete owned HTTP response |
| 6 | Observation GREEN emitted |

A disposable single-process parent harness imports the exact committed HTTPS
supervisor, observer and checker source from a temporary detached worktree.
Explicit fixture boundaries replace the remote adapter and node entry, and
pause authority/request delivery at the selected cut. The node model owns
literal loopback HTTP 4100 and P2P 4700, an exclusive disposable `live` directory,
a held directory FD and a writable journal FD. No actual VOID node, production
data, key or public seed is used. Fixture HMAC material is generated for the
schedule, tested with a challenge, retained only in controller memory and never
written into logs or receipts.

The external controller imports no production validation code. It owns ticks
and reads bounded procfs PID/parent/start, argv, executable, descriptor metadata
and socket inode/tuple state. It never reads process environments, data contents
or descriptor file-path targets. IPC reports select barriers; external census
is the recovery evidence. Before releasing the entry barrier it verifies no
listener or disposable data handle has been acquired, and that the wrapper's
armed message preceded entry execution. The source-pinned wrapper establishes
registration before the import, even if parent death races with startup.

Every predecessor schedule must retain and classify the orphan through 64 fixed
100 ms ticks; G2 must fail exclusive custody rather than claim success beside
it. Every successor must retire G1 before tick 64. Only then does the controller
archive its own disposable residue to `retired-g1`; G2 creates fresh `live` and
journal inodes, owns the exact ports, and reaches its terminal before tick 64
without a launch retry. This archive step is fixture reconstruction, not a
production data recovery or adoption policy. A zombie with no owned resources
is classified explicitly rather than reported as an absent PID.

Create-only canonical receipts retain the external before/after/fresh censuses,
cut, source/runtime identity, generation, data inodes and terminal timing. An
old observation hash is historical and never admissible for G2. The independent
verifier opens bounded regular files without following symlinks, validates their
canonical UTF-8 bytes, requires exactly twelve named members, and checks source
bytes against Git plus the actual runtime executable. It rejects missing,
duplicate, reordered, stale, re-pinned, cross-head/runtime, partial, surviving
orphan, late, adopted-authority/data/receipt and unarmed-entry mutations. It
publishes one create-only aggregate per runtime outside the input directory.

`SUPERVISOR_LOSS_RECOVERY_GREEN` is limited to this cooperative hosted fixture
profile. The retained workflow/run/artifact provenance is required; hashes are
not signatures. Full compiled-source derivation, effective follower configuration,
fresh synchronization, continuous no-Tailnet provenance, authenticated public
P2P and an actual external Nimo run remain open. All public onboarding/session
acceptance flags remain false; no Chain-2050 fact or DataNet retention claim
advances. This source work does not authorize an operator launch or deployment.

# Optional build inventory and selected follower admission

The next startup boundary is opt-in through
`VOID_NIMO_BUILD_RECEIPT_SHA256_V1=<verified receipt SHA-256>`. The child wrapper
checks `.runtime/nimo-build-admission-v1.json` before importing `dist/index.js`.
The expected hash must come from independently verified build/workflow evidence.
Accepting a caller-supplied receipt together with its caller-supplied hash does
not authenticate a build. Absent this option, the existing startup path is
unchanged and the build-admission module is not loaded. Invalid/empty values HOLD.

The preparer runs only in a fresh checkout with no `dist`. It never deletes old
output, starts the node, reads `.env`, or generates an identity key. After a
locked `npm ci --ignore-scripts`, it runs the exact three commands of the normal
build recipe with the selected Node executable: TypeScript compilation, runtime
JS copy/terminal retirement, and periodic-rewriter retirement. Any failed step
rejects the build, even if TypeScript emitted partial output. Existing build
markers or the mere presence of `dist/index.js` cannot substitute for a build.

The create-only receipt binds the Git head/tree, entire tracked `src` input
tree, repository JS/MJS/CJS helpers, package/lock/build config, workflow, actual
Node binary, every emitted `dist` file and every installed dependency file/link.
Untracked compiler inputs reject. All source files must match Git blobs before
and after compilation; dependencies and the Node binary must remain equal.
The installed TypeScript version must equal the lockfile's 5.9.3. The proof does
not infer npm-package publisher identity from a content hash; locked installation
and workflow/compiler/kernel custody are trust inputs.

Input enumeration and reads are bounded: at most 65,536 Git entries, 32,768
inventory entries, depth 32, 32 MiB per ordinary file, 512 MiB per tree and
16 MiB per receipt. Regular files cannot be symlinks or hard links, and reads
check stable metadata through completion. Dependency symlinks are recorded
without traversing them and must resolve inside `node_modules`; output and
source symlinks reject. Canonical UTF-8 receipt bytes and an exact supplied hash
are checked before semantic admission. Added, removed or changed output or
dependency files reject, including files outside the entry module.

The hosted Node 22/24/26 matrix produces fresh inventories independently. Its
aggregate requires exactly three current-run/current-head receipts and identical
complete compiled output inventories. Dependency inventories remain separately
attributable to their actual Node/npm installation. The archive contains all
three detailed receipts and the comparison result. No actual node runs.

With admission enabled, startup rejects ambient `.env` by presence without
reading it. Loader and proxy keys reject by presence without reading values.
The wrapper requires the canonical built entry and normalizes a small public
configuration subset: HTTP/P2P ports and aliases, derived loopback adapter
origins, adapter-active flag, four bounded follower settings and the derived
pull limit. Noncanonical/out-of-range values reject instead of being silently
clamped. A protected environment view permits same-value writes but rejects
changes, deletion or redefinition of those keys, and cannot be replaced through
the normal `process.env` property. Other environment values are not copied into
the admission record.

The proof checks inventory mutations, wrong source/runtime/recipe, partial and
noncanonical receipts, ambient-input presence, protected-setting changes and
actual-wrapper import ordering. It also verifies the real full build, exercises
enforcement in a plain Node child, and executes the actual compiled follower
module with explicit node/timer/HTTP fixture boundaries. That establishes the
selected defaults/custom settings are consumed by the follower scheduling path;
it does not execute `node_core` or synchronize chain data.

The startup IPC record reports `build_inventory_matched_at_start=true` and
`selected_follower_settings_enforced=true`. It keeps
`full_runtime_configuration_bound=false`, `continuous_code_custody_bound=false`,
`runtime_session_bound=false` and `public_onboarding_accepted=false`. This is a
cooperative startup check, not hostile same-UID isolation or a loader sandbox.
Later filesystem changes, runtime files read outside these inventories, manually
invoked follower routes, all other effective configuration and a fresh complete
sync still require their own session evidence. The IPC record is not a reusable
authorization credential and does not upgrade the separate observer receipt.

Precision does not need a live checkout update for this source work. A later
operator test should use a separately prepared checkout and verified build
receipt after current-head review. Do not pull this draft into the running
Precision checkout or restart the seed merely to exercise this check. Preparation,
host inspection, launch and post-sync evidence remain separate operations.

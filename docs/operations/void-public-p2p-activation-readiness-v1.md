# VOID public P2P activation readiness v1

Marker: `VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1`

## Purpose

Provide one fail-closed, machine-readable source gate between the already merged
public P2P/UDP discovery groundwork and any future production activation.

The repository already contains release-root validation, signed bootstrap-record
ID validation, signed-observer authorization, relay-introduction collection,
verified discovery composition, and a bounded runtime mount. Those contracts are
deliberately not the same thing as production trust material or a deployed
zero-configuration P2P path.

This gate collects the current production truth in one place instead of requiring
an operator or reviewer to infer activation readiness from several independent
documents and proofs.

## Required gates

`ACTIVATION_SOURCE_READY` requires all of the following at the same repository
generation:

1. the committed bootstrap-record release root is valid and `active`, with a
   nonzero threshold satisfied by its committed public-key set;
2. at least one `void_bootstrap_record_signed_id_v1` validates against that
   exact active release root, either as a standalone published artifact or as
   the signed-record binding embedded in a valid relay-introduction envelope;
3. at least one published
   `void_p2p_udp_swarm_observer_authorization_v1` is currently valid against that
   exact root;
4. the merged public relay-introduction collector source contract is present;
5. the merged UDP runtime mount contains the collector and verified-discovery
   activation seam;
6. the normal node entrypoint contains an awaited runtime-mount construction,
   registers the read-only status route with that exact mount binding, and
   awaits the public relay-introduction collector start on the same binding;
   mere identifier text, comments, strings, or mismatched mount variables do
   not satisfy this gate; and
7. the checked-in operator defaults remain fail-closed with the UDP-swarm
   runtime and orchestration switches disabled unless separately configured.

A `void_p2p_udp_swarm_public_relay_introduction_v1` is deliberately **not** a
repository source gate. Its discovery lease is only 30 seconds through 10
minutes, so committing one as durable Git state would make readiness expire
without a source change. Live relay introductions are a deployment/runtime
requirement and are still fully validated by the existing collector and
composition path before route activation.

Missing or invalid trust material never degrades into implicit readiness.
The committed trust-artifact scan is additionally bounded to 96 matching
production candidates across the three readiness schemas; exceeding that budget
is a HOLD rather than an invitation to perform an unbounded compatibility
cross-product.

## Artifact discovery

The tool scans only regular, non-symlink JSON files below committed `config/`
and `public/` paths.
JSON trust artifacts remain capped at 1 MiB each; reviewed source-text reads are separately capped at 8 MiB so the current `src/index.ts` is classifiable without widening artifact input bounds. It ignores docs, fixtures, tests, caches, operator-home
files, environment files, credentials, and runtime state.

Artifacts are identified by their exact schema, not by filename:

- `void_bootstrap_record_signed_id_v1`
- `void_p2p_udp_swarm_observer_authorization_v1`
- `void_p2p_udp_swarm_public_relay_introduction_v1`

Signed record IDs and observer authorizations are source gates and are checked
with the existing production validators.

Relay-introduction JSON found in committed `config/` or `public/` remains a
**diagnostic candidate only**. When present, the tool still reuses the existing
authorized verified-discovery composition with injected in-memory fetch
callbacks that always fail. Reaching the record-fetch callback proves the
candidate passed the pre-transport release-root, signed-record,
observer-authorization, discovery-signature/topology/window, and locator-mirror
checks without network I/O. This preserves adversarial validation coverage while
preventing an ephemeral lease from becoming durable source authority.

## Current production truth

The repository is now `ACTIVATION_SOURCE_READY`, while production deployment
and public onboarding remain unauthorized pending live runtime evidence:

- the bootstrap-record release root is `active`, threshold `1`, with the
  public Nimo release key
  `voidbrk1_bbd03f57c88d6c79646023b5cf871f2fa631eeb54a1f8f9fb3711359e6af1087`;
- the exact production bootstrap-record ID is signed by the active Nimo release
  key and committed as `config/void-bootstrap-record-signed-id-v1.json`;
- the Nimo + Precision observer set is signed by the active Nimo release key and
  committed as `config/void-p2p-udp-swarm-observer-authorization-v1.json`;
- no durable relay-introduction artifact is committed, by design; rotating
  introductions belong to live peer publication at
  `/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json`;
- the collector and runtime-mount source contracts exist;
- `src/index.ts` now constructs the UDP-swarm runtime mount, registers its
  read-only status route, and conditionally starts the public relay-introduction
  collector on that same mount binding;
- collector startup is separately gated by exact
  `VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENABLED=1`, requires the UDP runtime
  itself to be enabled, and validates the fixed repository release-root and
  observer-authorization artifacts before any bootstrap-content fetch;
- the committed release root, signed bootstrap-record ID, signed observer
  authorization, collector source, runtime-mount seam, and entrypoint wiring
  satisfy the source gate; live relay topology/publication is still absent, so
  production activation remains unauthorized and the live runtime remains
  fail-closed;
- `ops/run-void-node-live-v1.sh` currently does not mention the UDP-swarm
  activation variables; this is reported as source truth but is not by itself a
  blocker because inherited service environment survives the launcher; and
- `.env.example` remains fail-closed with runtime, orchestration, and public
  introduction collection disabled.

The existing HTTPS bootstrap path is separately observed and reported. A healthy
HTTPS sync seed does not imply public raw-P2P activation.

## CLI

```bash
node tools/void-public-p2p-activation-readiness-v1.mjs
```

Optional JSON receipt:

```bash
node tools/void-public-p2p-activation-readiness-v1.mjs \
  --output /tmp/void-public-p2p-activation-readiness-v1.json
```

Exit codes:

- `0` — `ACTIVATION_SOURCE_READY`
- `2` — truthful `HOLD`
- `1` — malformed or unreadable required source evidence

## Proof

```bash
node scripts/prove_void_public_p2p_activation_readiness_v1.mjs
```

Expected marker:

```text
VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1_PROOF_GREEN
```

The proof requires the current repository snapshot to remain a truthful
`ACTIVATION_SOURCE_READY` while `production_activation_authorized=false` and
`external_acceptance_required_after_deployment=true`. Its synthetic relay
fixtures still exercise fully signed discovery, independent source quorum, two
relay failure domains, HTTPS+Tor locator diversity, and executable entrypoint
call shapes. Invalid or incomplete relay introductions remain diagnostically
rejected, but their absence cannot expire a durable source generation. Token-only
or comment-only entrypoint text and mismatched mount bindings remain source
HOLDS.

## Authority boundary

`ACTIVATION_SOURCE_READY` is still **not** deployment or external acceptance.

This lane does not:

- generate, read, rotate, or publish any private signing key;
- sign a bootstrap record, observer authorization, or relay-introduction
  artifact;
- publish or activate trust material;
- deploy or activate the new `src/index.ts` source wiring, change the live
  launcher, systemd, DNS, firewall, router, or network interfaces;
- start, stop, reload, restart, or deploy a service;
- access a wallet or signer;
- sign or broadcast a transaction;
- mutate validator, Work Credit, treasury, or chain state; or
- move funds.

After any separately reviewed deployment, #1005 still requires fresh runtime and
independent outside-network N-1 acceptance evidence before the capability can be
called externally accepted.

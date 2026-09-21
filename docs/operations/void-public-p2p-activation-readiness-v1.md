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
4. at least one published
   `void_p2p_udp_swarm_public_relay_introduction_v1` is structurally valid and
   carries a signed bootstrap-record ID that validates against the exact root;
5. the merged public relay-introduction collector source contract is present;
6. the merged UDP runtime mount contains the collector and verified-discovery
   activation seam;
7. the normal node entrypoint actually mounts that runtime; and
8. the checked-in operator defaults remain fail-closed with the UDP-swarm
   runtime and orchestration switches disabled unless separately configured.

Missing or invalid trust material never degrades into implicit readiness.

## Artifact discovery

The tool scans only regular, non-symlink JSON files below committed `config/`
and `public/` paths. It ignores docs, fixtures, tests, caches, operator-home
files, environment files, credentials, and runtime state.

Artifacts are identified by their exact schema, not by filename:

- `void_bootstrap_record_signed_id_v1`
- `void_p2p_udp_swarm_observer_authorization_v1`
- `void_p2p_udp_swarm_public_relay_introduction_v1`

Signed record IDs and observer authorizations are checked with the existing
production validators. Relay-introduction candidates must have the exact closed
envelope keys, bounded mirror count, canonical discovery ID shape, and an
embedded signed record ID valid under the active release root.

## Current production truth

At the source generation that introduced this gate, production is intentionally
`HOLD`:

- the bootstrap-record release root is `hold_no_signing_keys`, threshold `0`,
  with zero keys;
- no committed production signed bootstrap-record ID is published;
- no committed production signed-observer authorization is published;
- no committed production relay-introduction artifact is published;
- the collector and runtime-mount source contracts exist;
- `src/index.ts` does not mount the UDP-swarm runtime;
- `ops/run-void-node-live-v1.sh` currently does not mention the UDP-swarm
  activation variables; this is reported as source truth but is not by itself a
  blocker because inherited service environment survives the launcher; and
- `.env.example` remains fail-closed with both runtime and orchestration disabled.

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

The proof also requires the current production snapshot to remain a truthful
`HOLD`. When production trust material or live wiring changes, this proof is
expected to fail until the readiness contract is reviewed against the new
generation.

## Authority boundary

`ACTIVATION_SOURCE_READY` is still **not** deployment or external acceptance.

This lane does not:

- generate, read, rotate, or publish any private signing key;
- sign a bootstrap record, observer authorization, or relay-introduction
  artifact;
- publish or activate trust material;
- change `src/index.ts`, the live launcher, systemd, DNS, firewall, router, or
  network interfaces;
- start, stop, reload, restart, or deploy a service;
- access a wallet or signer;
- sign or broadcast a transaction;
- mutate validator, Work Credit, treasury, or chain state; or
- move funds.

After any separately reviewed deployment, #1005 still requires fresh runtime and
independent outside-network N-1 acceptance evidence before the capability can be
called externally accepted.

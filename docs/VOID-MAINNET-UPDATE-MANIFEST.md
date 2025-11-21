# VOID Network - Mainnet Update Manifest (Spec v0.1)

This document defines the shape and expectations of the update
manifest for VOID mainnet (chainId 2050).

It does not define the on-chain UpdateGate contract itself
(see docs/UPDATE-GATE-CONTRACT.md). Instead, it describes the JSON
manifest that:

- Node-side exporters read.
- Prometheus gauges are derived from.
- Operators and tooling rely on to decide whether their node is on a
  valid, non-expired mainnet build.

------------------------------------------------------------
1. Purpose
------------------------------------------------------------

The mainnet update manifest answers:

- Which protocol version / build should mainnet nodes be running?
- How long is this build valid before it must be rotated?
- Where can operators verify the build and release notes?

The manifest is off-chain JSON, but its hash and key fields are
expected to be tied into:

- UpdateGate on-chain.
- Our monitoring (Prometheus + Alertmanager).

------------------------------------------------------------
2. File location
------------------------------------------------------------

Working path (v0.1):

- docs/VOID-MAINNET-UPDATE-MANIFEST.json

The JSON file is:

- Owned by the VOID core maintainers.
- Updated only as part of a signed release process.
- Read by a root-level exporter that emits metrics such as:
  - void_mainnet_core_manifest_health
  - void_mainnet_core_manifest_days_left

Exact exporter wiring already exists for mainnet-core; this spec is
the human-readable contract for what that JSON must contain.

------------------------------------------------------------
3. JSON shape (v0.1)
------------------------------------------------------------

The manifest JSON must be a single object with at least:

{
  "chain": "mainnet-core",
  "chainId": 2050,

  "protocolVersion": "1.0.0",
  "buildId": "void-mainnet-core-1.0.0",
  "gitCommit": "0000000000000000000000000000000000000000",
  "releaseTag": "v1.0.0-mainnet-core",

  "issuedAt": "2025-11-20T00:00:00Z",
  "expiresAt": "2025-12-19T00:00:00Z",

  "downloadUrl": "https://example.invalid/void-mainnet-core/v1.0.0",
  "releaseNotesUrl": "https://example.invalid/void-mainnet-core/v1.0.0/notes",

  "notes": [
    "First public VOID mainnet-core release.",
    "Single-proposer initial network; multi-validator later."
  ]
}

Notes:

- chain is a short identifier for this manifest lineage
  (here: "mainnet-core").
- chainId must be 2050.
- protocolVersion is the human-facing protocol string.
- buildId is the internal ID used by CI / packages.
- gitCommit must be the full 40-character commit hash.
- releaseTag must be the annotated git tag for this release.
- issuedAt / expiresAt MUST be ISO 8601 UTC timestamps.

The exporter is responsible for computing:

- days_left = floor((expiresAt - now) / 86400).

------------------------------------------------------------
4. Metrics expectations
------------------------------------------------------------

From this manifest, the exporter and rules must ensure:

1) A scalar health gauge:

- void_mainnet_core_manifest_health

  - 1 when:
    - Manifest parses.
    - chainId == 2050.
    - now < expiresAt.
  - 0 otherwise.

2) A scalar days-left gauge:

- void_mainnet_core_manifest_days_left

  - Non-negative integer days from now to expiresAt.
  - Clamped at 0 when expired.

Recording rule example (already in Prometheus):

- void:mainnet_core:manifest_days_left:last =
    last_over_time(void_mainnet_core_manifest_days_left[5m])

Alert expectations (high-level):

- Warn when days_left < 14
- Critical when:
  - days_left < 7
  - or manifest_health != 1

Exact thresholds are defined in Prometheus alert files, but this spec
defines the intent.

------------------------------------------------------------
5. Relationship to UpdateGate
------------------------------------------------------------

On-chain UpdateGate is responsible for:

- Tracking which manifest hash is considered valid.
- Enforcing activation rules for protocol changes.

This manifest JSON is expected to be:

- Built by CI.
- Hashed (for example with keccak256 or SHA-256).
- Registered on-chain via UpdateGate as the current manifest.

Nodes are expected to:

- Read the JSON locally (packaged with their release).
- Compare its hash / version against what UpdateGate says is current.
- Emit telemetry if there is a mismatch.

Future spec versions (v0.2+) will include:

- Exact hash algorithm and field used in UpdateGate.
- Example updateId and manifestHash wiring.

------------------------------------------------------------
6. Open items (before v1.0)
------------------------------------------------------------

Before we bump this spec to v1.0 and freeze the first mainnet
manifest format, we must:

- [ ] Finalize the exact JSON fields and remove placeholders.
- [ ] Decide and document the hash algorithm used for manifestHash
      in UpdateGate.
- [ ] Lock in alert thresholds and write them into the Prometheus
      alert file for mainnet-core.
- [ ] Document the CI pipeline step that:
      - Writes docs/VOID-MAINNET-UPDATE-MANIFEST.json
      - Computes its hash
      - Publishes release artifacts.
- [ ] Align this spec with the eventual public operator docs
      (docs/VOID-MAINNET-OPERATOR-GUIDE.md).

Once done, we:

- Bump this spec to v1.0.
- Tag the repo with a mainnet manifest checkpoint.
- Treat both the spec and the JSON manifest as immutable for the
  lifetime of that protocol version.

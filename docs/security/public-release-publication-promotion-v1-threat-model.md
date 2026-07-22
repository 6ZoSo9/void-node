# Threat Model: Public Release Publication and Promotion v1

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_THREAT_MODEL_V1`

## Protected assets

- release tag to source-commit binding;
- release archives, installer, manifest, checksums, SBOM, and channel manifests;
- provenance and SBOM attestations;
- publication and canary receipts;
- candidate/stable pointers;
- revocation and freeze state;
- append-only promotion history.

## Threats and controls

### Tag replacement

Publication fails if the remote tag exists. Repository release immutability is
checked before tag creation. Published immutable tags are never force-pushed,
deleted, or reused.

### Asset replacement

The workflow does not use `gh release upload`, `--clobber`, or release deletion.
All assets are present before publication, verified individually, and protected
by release immutability after publication.

### Wrong source or version

Version, package version, release tag, checkout commit, and `origin/main` must
match exactly. The publication packet binds all of them and every asset hash.

### Compromised build output

The deterministic build emits SHA-256 manifests and an SPDX SBOM. GitHub Actions
creates build provenance and SBOM attestations. Publication verification checks
the immutable release attestation and each local asset against the release.

### Premature stable promotion

Stable promotion requires the current candidate, immutable publication receipt,
and a canary receipt bound to the same packet, publication receipt, tag, and
source commit.

### Promotion-history rewriting

The ledger is hash-chained. Each record binds the prior record hash and the full
post-transition state hash. Derived public files must exactly regenerate from the
ledger or verification fails.

### Freeze bypass

Freeze blocks candidate and stable promotion. Revocation and emergency rollback
remain possible so incident response cannot be trapped by the freeze itself.

### Revoked release reuse

A revoked tag cannot be promoted or selected as a rollback target. Revoking the
current stable release requires an atomic move to a previously stable,
non-revoked release.

### Stale outer status from GitHub Actions

The promotion PR helper inspects the underlying Actions job. A stale outer
`pending` status may be reclassified only when the job has a completion time and
a successful, skipped, or neutral conclusion. Failures and genuinely running
jobs remain blocking.

### Privilege expansion

The publication workflow is protected by a dedicated environment and token.
Canary work is isolated and does not start a service. None of these tools deploy
a live node, move money, fulfill Buy VOID, admit validators, change treasury
state, or transfer authority.

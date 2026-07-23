# First Official Release Rehearsal v1 — Operator Runbook

No official release is published by this runbook.

## Preconditions

- Work from a clean clone of `main`.
- Use Node.js 22 or newer.
- Install development dependencies with `npm ci --include=dev`.
- Use an SSH GitHub remote and verify it with `BatchMode=yes`.
- Confirm tracked Python bytecode is zero.

## One-command rehearsal

```bash
make public-first-official-release-rehearsal-v1-proof
```

The proof creates all artifacts in a temporary directory and deletes them when finished. The default rehearsal version is the package version with `-rehearsal.1` appended.

Override the version only with a semver value:

```bash
VOID_REHEARSAL_VERSION=0.1.0-rehearsal.2 \
make public-first-official-release-rehearsal-v1-proof
```

## Required green boundaries

The final output must include:

```text
VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1 FULL_GREEN
VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1 FULL_GREEN
release_tag_published=false
official_release_published=false
live_deployment=false
service_restart=false
money_movement=false
guarded_lanes_activated=false
```

## Stop conditions

Stop immediately on nondeterministic checksums, missing assets, reordered stage receipts, a receipt-hash mismatch, incomplete qualification targets, reviewer/runner overlap, a tracked `.pyc`, a generated repository `__pycache__`, an HTTPS push prompt, or any live-publication command.

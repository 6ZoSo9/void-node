# Self-Hosted Beta Proof Success — 2026-03-23

## What succeeded

Manual GitHub Actions workflow:

- `self-hosted-beta-proof`

Runner/job facts:

- self-hosted runner online
- labels matched:
  - `self-hosted`
  - `void-node`
  - `beta-proof`

Workflow steps passed:

- `make beta-help`
- `make public-beta-status`
- `make wc-wallet-proof`
- `make public-beta-preflight`

## Meaning

The real bounded beta proof commands now run successfully on the self-hosted runner against the live local VOID beta topology.

## Honest caveat

This success depends on the local workstation topology and the local sudo policy that allows the runner user path to execute the bounded proof flow noninteractively.

## Follow-up

A GitHub warning noted that `actions/checkout@v4` is still on the older Node runtime line and should be updated before forced Node 24 migration.

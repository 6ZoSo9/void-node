# VOID Node Self-Hosted Beta CI Plan

## Why this exists

The real bounded proof commands depend on the local live topology:

- `make wc-wallet-proof`
- `make public-beta-preflight`

Those commands require the local node/helper/services topology, local ports, system user layout, and repo state that do **not** exist on GitHub-hosted runners.

So:

- GitHub-hosted CI should keep running `.ci/beta-proof-guards.sh`
- real proof automation should run only on a self-hosted runner on a machine that actually has the VOID beta stack

## Proposed runner labels

Use a dedicated self-hosted runner with labels like:

- `self-hosted`
- `void-node`
- `beta-proof`

## Preconditions on the self-hosted runner host

The host should already have:

- repo checked out
- `make`
- `bash`
- `node` / `npm`
- the local VOID beta stack topology available
- the commands below green when run manually:
  - `make public-beta-status`
  - `make wc-wallet-proof`
  - `make public-beta-preflight`

## Safe rollout plan

1. Keep the GitHub-hosted guard workflow enabled:
   - `.github/workflows/beta-proof-guards.yml`

2. Add an opt-in self-hosted workflow that is **manual only**:
   - `workflow_dispatch`
   - no push trigger initially

3. First validate manually on the runner host:
   - `make public-beta-status`
   - `make wc-wallet-proof`
   - `make public-beta-preflight`

4. Only after repeated green runs, consider adding:
   - scheduled runs
   - branch-based runs
   - optional notifications

## Honest caveat

The self-hosted runner workflow is only trustworthy if it runs on a host that actually matches the real beta topology.
Do not treat a fake/minimal runner as proof of the live path.

## Current green command set

- `make beta-help`
- `make public-beta-status`
- `make public-beta-preflight`
- `make wc-wallet-proof`
- `make public-beta`
- `./ops/public-beta-quickstart.sh`

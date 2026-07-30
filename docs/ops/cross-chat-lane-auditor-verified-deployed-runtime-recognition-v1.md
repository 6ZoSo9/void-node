# Cross-chat lane auditor verified deployed runtime recognition v1

## Objective

Allow the collision auditor to recognize two narrowly defined, systemd-owned Node.js deployment shapes that are intentionally long-lived:

1. `void-agent-mcp-readonly-http-v1.service`
2. `void-public-node-tor-backend-v1.service`

The Tor transport daemon is a separate `/usr/bin/tor` process and remains outside the Node runtime classifier.

## Security boundary

Recognition requires every common and profile-specific condition:

- exact systemd cgroup service unit;
- exact `/usr/bin/node` executable;
- minimum process age and non-zombie state;
- no child processes;
- no descriptors into Git metadata;
- clean registered deployment worktree;
- deployment head included in `origin/main`;
- exact deployment directory naming convention;
- exact argument count and ordering;
- runtime script resolving inside the deployment;
- required binding or hostname artifacts as regular files.

Arbitrary `node`, terminal-launched, dirty, unmerged, young, child-owning, or Git-touching processes remain conflicts.

## Profiles

### MCP read-only HTTP service

The deployment must be beneath `~/.local/share/void-agent-mcp-readonly-http-v1/releases/`. Its directory name begins with the first 12 characters of its clean deployment head and ends with a UTC release timestamp. The `current` script argument must resolve into that release.

### Onion public-node backend

The deployment directory must be `void-onion-discovery-live-v1-<head8>`. The service executes `tools/void-tor-onion-public-node-v1.mjs` with the exact host, port, virtual-port, hostname-file, and binding-file contract.

## Proof posture

The proof covers both positive profiles, adversarial profile mutations, a live exact-green audit, an arbitrary synthetic Node conflict, and exact-green restoration after that process exits.

## Production boundaries

This lane does not start, stop, restart, or signal services; alter Tor configuration; expose routes; activate economic writes; modify deployments; or move funds.

## Canonical dirty-path parsing

Dirty paths are read directly from untrimmed `git status --porcelain=v1 -z`
output. This preserves the leading status column of the first record, supports
spaces and line breaks in filenames, and includes both paths of rename/copy
records. The generic `git()` helper is intentionally not used for this read
because it trims command output.

## Active-lane self-overlap

The active lane is present in `git worktree list`, but its own changes are
already governed by `laneDirtyReservedOnly`. The auditor therefore excludes
`options.laneRepo` only from external worktree inspection-error and overlap
checks. A different worktree touching a reserved path still forces HOLD.


## GitHub Actions portability

The live proof requires a named local branch, an explicit
`refs/remotes/origin/main` tracking reference, and read-only access to list open
pull requests. The workflow therefore:

- checks out full history;
- fetches `main` into `refs/remotes/origin/main`;
- creates a local branch using `github.head_ref` or `github.ref_name`;
- exposes `github.token` as `GH_TOKEN`;
- grants only `contents: read` and `pull-requests: read`.

The proof reads the expected lane branch from `VOID_LANE_BRANCH` in CI and
retains the fixed development-lane branch as its local default. These changes
do not weaken runtime recognition or permit a missing remote-main reference.


## CI fixture and live-runtime policy

GitHub-hosted runners do not run the deployed VOID MCP read-only service or Tor
onion backend. CI therefore proves both recognition contracts through the
positive and adversarial pure fixtures while still requiring the complete live
collision audit to return exact green for the runner's own process boundary.

`VOID_REQUIRE_LIVE_VERIFIED_RUNTIME_PROFILES` controls only the final assertion
that both deployed profiles are physically present in the live scan:

- unset: required outside GitHub Actions;
- `1`: explicitly required;
- `0`: explicitly not required.

The GitHub Actions workflow sets this variable to `0`. Local VOID-host proofs
leave it unset and continue to require both live deployed profiles. This does
not weaken profile predicates, fixture coverage, arbitrary-process rejection,
worktree checks, PR checks, or the collision-safety result.

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

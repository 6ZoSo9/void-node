# VOID node fleet process freshness audit v1

Marker: `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1`

## Purpose

Determine whether each running `void-node-live.service` process started after
the source currently checked out on that node, or whether source moved after
the process started and a separately authorized restart is required.

This is the read-only bridge between source convergence and deployment. Source
convergence can fast-forward a clean `main` worktree while the already-running
Node process retains modules loaded from the old source. This audit detects that
state without restarting, reloading, building, installing, fetching, or changing
anything.

## Why `/version.git_commit` is diagnostic only

The current `/version` handler derives `git_commit` when the request arrives. A
source-only fast-forward can therefore make `/version.git_commit` report the new
checked-out HEAD even while the service process still runs modules loaded before
that fast-forward.

V1 records whether `/version.git_commit` matches source HEAD, but never treats
that match as process identity. The receipt always includes:

```json
"version_git_commit_is_process_identity": false
```

Process freshness is instead bounded to evidence from the service MainPID, its
start timestamp, the repository HEAD reflog transition timestamp, its working
directory and command line, and current clean-source/runtime health checks.
Source and service identity are sampled at both edges of collection; either
changing while health/readiness evidence is gathered forces `HOLD`.

## Configuration

The audit reuses the local `VOID_NODE_FLEET_DRIFT_CONFIG_V1` file documented in
`docs/operations/void-node-fleet-drift-audit-v1.md`. No additional field is
required. V1 uses only these node fields:

- exact node name and `local` or `ssh` transport;
- SSH alias for an SSH node;
- absolute or home-relative repository path;
- safe user-systemd service name; and
- numeric-loopback HTTP base URL.

The canonical branch must be exact `main`. Do not put tokens, passwords,
private-key paths, authorization headers, or wallet material in the config.

## Run

Audit the configured fleet:

```bash
node tools/void-node-fleet-process-freshness-audit-v1.mjs \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-freshness-result-v1.json"
```

Audit exactly one configured node:

```bash
node tools/void-node-fleet-process-freshness-audit-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-freshness-nimo-v1.json"
```

Output files are created or tightened to mode `0600`. Receipts do not contain
repository paths, SSH targets, process IDs, executable paths, command lines,
service start text, credentials, or HTTP response bodies.

## Evidence and classification

For each node, the collector reads:

- matching before/after Git HEAD, exact branch, readable porcelain status, and
  modification epoch of that worktree's absolute `logs/HEAD` reflog path;
- matching before/after `ActiveState`, `MainPID`, and
  `ExecMainStartTimestamp` snapshots from read-only `systemctl --user show`
  calls;
- boolean checks that the MainPID working directory is the configured repo, its
  executable is Node, and one argv token is relative `src/index.ts` or the exact
  absolute `<repo>/src/index.ts` used by `ops/run-void-node-live-v1.sh`; and
- loopback `/health`, `/__void/ready.json`, and `/version` responses.

The tool emits one of three node classifications:

- `PROCESS_SOURCE_ALIGNED` — exact `main`, clean source, active matching Node
  process, green health/readiness, and the process started at least one whole
  second after the latest HEAD transition;
- `STALE_SOURCE_AFTER_PROCESS_START` — all other gates are green, but HEAD
  transitioned at least one whole second after process start; or
- `HOLD` — identity, source, health, timestamp, transport, or parsing evidence is
  missing, changes during collection, or is ambiguous.

The one-second separation is deliberate because the portable evidence is
second-granularity. Equal-second observations fail closed as
`timestamp_order_ambiguous`. A HEAD transition or process-start time more than
five seconds ahead of observation also holds.

Fleet decisions and process exit codes are:

| Fleet decision | Meaning | Exit |
| --- | --- | ---: |
| `PROCESS_FRESH` | Every selected node is process/source aligned. | `0` |
| `HOLD` | At least one selected node has incomplete or ambiguous proof. | `2` |
| `RESTART_REQUIRED` | No node is ambiguous and at least one process predates its current source. | `3` |

`RESTART_REQUIRED` is evidence, not restart authority. After a separately
authorized build/deployment/restart, run this audit again and require
`PROCESS_FRESH` before claiming runtime convergence.

## Prerequisites and conservative behavior

- Run as the same user that owns the user-systemd service and can read its
  MainPID `/proc` metadata.
- The repository must have a readable HEAD reflog. Missing or unreadable reflog
  timing is `HOLD`, never inferred from commit author or committer timestamps.
- The current runtime contract is the checked-in `ops/run-void-node-live-v1.sh`
  shape: Node/Node.js executing `src/index.ts` from the configured repo.
- V1 does not follow child processes or accept a different entrypoint. A changed
  service topology fails closed until a reviewed audit version supports it.
- An unavailable SSH node, inactive service, dirty worktree, detached/wrong
  branch, future time, non-JSON endpoint, unhealthy node, or non-ready node is
  `HOLD`.
- A source HEAD/branch/status/reflog transition or service
  ActiveState/MainPID/start tuple that changes between the collector's bracketing
  snapshots is `HOLD`; the tool never combines evidence across that race.

## Authority boundary

This audit is read-only. It does not:

- fetch, pull, merge, reset, checkout, or alter Git refs or files;
- run package managers, install dependencies, or build source;
- start, stop, restart, reload, signal, or enable a service;
- deploy or claim deployment;
- change Tailscale, Tor, firewall, router, DNS, or interface state;
- read or print credentials, private keys, tokens, authorization headers,
  wallets, or signers;
- sign or broadcast transactions; or
- move funds or mutate Buy VOID, Work Credits, validator, consensus, or treasury
  state.

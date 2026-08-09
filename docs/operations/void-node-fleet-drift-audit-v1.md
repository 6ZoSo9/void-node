# VOID node fleet drift audit v1

Marker: `VOID_NODE_FLEET_DRIFT_AUDIT_V1`

## Purpose

Provide one fail-closed, read-only fleet audit for the operator machines before
any synchronization or deployment work is considered.

The audit is intended to run from Precision. It collects a bounded
runtime/repository snapshot from Precision, Nimo, and Alienware, resolves the
canonical `main` SHA with `git ls-remote`, compares each observed deployed
repository head with that target, and classifies the fleet without changing a
node.

This closes the visibility gap between GitHub source movement and the separately
authorized runtime deployment process.

## Why raw commit counts are insufficient

A node can be many Git commits behind while most intervening commits are docs,
fixtures, proof scripts, or CI. Conversely, one commit can materially change the
running node.

The audit therefore reports both `commits_behind` and changed-path classes.

Changed paths are separated into:

- `runtime_core` — `src/`, package/runtime engine files, Dockerfile, TypeScript config;
- `operator_surface` — `ops/`, `ops/voidctl`, and non-proof scripts;
- `public_surface` — static/public runtime content;
- `protocol_source` — contracts and committed configuration;
- `integration_runtime` — agent/integration runtime source;
- `evidence_only` — docs, workflows, fixtures, schemas, examples, and `scripts/prove_*`;
- `review_required` — unknown paths, treated conservatively as runtime-relevant.

Unknown paths never become evidence-only by default.

## Node classifications

Each node is one of:

- `CURRENT`
- `BEHIND_EVIDENCE_ONLY`
- `BEHIND_RUNTIME_RELEVANT`
- `HOLD`

`HOLD` is emitted for conditions such as:

- node unreachable;
- repository unavailable;
- invalid or unknown deployed commit;
- dirty worktree;
- inactive node service;
- unhealthy `/health`;
- non-green `/__void/ready.json`;
- configured peer floor not met;
- deployed head ahead of or divergent from canonical main;
- canonical or deployed commit object missing from the coordinator repository; or
- comparison failure.

A dirty, divergent, or unhealthy node is never listed as a convergence
candidate.

## Canonical target without fetch

The default target is resolved with:

```text
git ls-remote origin refs/heads/main
```

The audit does **not** run `git fetch`, `git pull`, checkout, reset, or merge.

Git commit/range comparison is performed only with objects already present in
the coordinator repository. If the canonical target or a node head is not
present locally, the audit returns `HOLD` rather than silently fetching or
guessing.

A later guarded synchronization controller may perform a separately authorized
fetch/fast-forward step.

## Configuration

Configuration is intentionally local and not committed because SSH aliases and
machine addressing are operator-specific.

Print a template:

```bash
node tools/void-node-fleet-drift-audit-v1.mjs --print-example-config
```

Default config path:

```text
~/.config/void/node-fleet-drift-audit-v1.json
```

Example shape:

```json
{
  "marker": "VOID_NODE_FLEET_DRIFT_CONFIG_V1",
  "coordinator_repo": "~/dev/void-node",
  "canonical_remote": "origin",
  "canonical_branch": "main",
  "nodes": [
    {
      "name": "precision",
      "transport": "local",
      "repo": "~/dev/void-node",
      "service": "void-node-live.service",
      "http_base": "http://127.0.0.1:4100",
      "min_peers": 1
    },
    {
      "name": "nimo",
      "transport": "ssh",
      "ssh_target": "<operator SSH alias>",
      "repo": "~/dev/void-node",
      "service": "void-node-live.service",
      "http_base": "http://127.0.0.1:4101",
      "min_peers": 1
    },
    {
      "name": "alienware",
      "transport": "ssh",
      "ssh_target": "<operator SSH alias>",
      "repo": "~/dev/void-node",
      "service": "void-node-live.service",
      "http_base": "http://127.0.0.1:4100",
      "min_peers": 1
    }
  ]
}
```

Do not place passwords, private keys, tokens, or secret paths in this file. SSH
authentication remains external to the tool.

## Runtime collection

Remote collection uses SSH with `BatchMode=yes` and a bounded connection timeout.
The remote script reads only:

- exact Git `HEAD`;
- current branch name;
- dirty-entry count, without returning dirty path names;
- user-systemd service active state;
- `/health`;
- `/__void/ready.json`; and
- `/p2p/peers`, with `/peers` fallback.

It does not read service environment, credentials, keys, wallets, journals, WC
ledgers, transaction state, or private configuration.

## Output and convergence plan

The result contains an `audit_id_sha256` over the canonical target and normalized
node classifications.

Fleet decision is:

- `CURRENT` when every node is exact-current and green;
- `CONVERGENCE_RECOMMENDED` when all nodes are safe but at least one is behind;
- `HOLD` when any node cannot be proven safe to converge.

The `convergence_candidates` array is a **plan only**. It does not authorize or
perform synchronization.

Optional `--output` writes the JSON report mode `0600`.

## Authority boundary

This v1 lane never:

- fetches, pulls, checks out, resets, merges, or changes a Git ref;
- installs packages;
- starts, stops, reloads, or restarts a service;
- deploys a release;
- changes firewall, router, Tailscale, Tor, or interface state;
- reads credentials, private keys, mnemonics, tokens, or authorization headers;
- accesses a wallet or signer;
- signs or broadcasts a transaction;
- writes Work Credits;
- changes validator or consensus state; or
- moves funds.

A future fleet convergence apply path must remain a separate, explicitly
authorized operator gate and must consume an exact audited target rather than
silently updating to whatever `main` becomes later.

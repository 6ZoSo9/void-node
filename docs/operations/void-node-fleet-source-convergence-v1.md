# VOID node fleet source convergence v1

Marker: `VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1`

## Purpose

Consume one exact-green `VOID_NODE_FLEET_DRIFT_AUDIT_V1` result and safely
fast-forward the checked-out `main` source on exactly one audited node.

This closes the source-synchronization gap left intentionally by the read-only
fleet drift audit. It does not build, install packages, stop or restart a
service, deploy the synchronized source, or claim that the running process is
at the new commit.

The controller is dry-run by default. Applied use is a separate operator gate.

## Why one node at a time

Each node receives its own deterministic plan and exact confirmation set. A
failure, target race, or ambiguous SSH result stops at that node. The controller
never rolls forward to another machine and never retries automatically.

This keeps Precision, Nimo, and Alienware independently inspectable during
convergence instead of turning a partial fleet update into an all-or-nothing
guess.

## Required audit

Generate a fresh audit first:

```bash
node tools/void-node-fleet-drift-audit-v1.mjs \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --output "$HOME/.config/void/node-fleet-drift-audit-result-v1.json"
```

The controller accepts only an audit that:

- has marker/version `VOID_NODE_FLEET_DRIFT_AUDIT_V1` / `1`;
- reports `CONVERGENCE_RECOMMENDED`;
- proves no prior mutation and no granted mutation authority;
- has an internally reproducible `audit_id_sha256`;
- contains no `HOLD` node;
- lists every behind node, and only behind nodes, as convergence candidates;
- binds the selected node's exact branch, clean worktree, green service,
  health, readiness, peer state, old SHA, target SHA, and path classification;
  and
- is no older than 300 seconds by default.

The audit age limit is configurable from 1 through 3600 seconds with
`--max-audit-age-seconds`. Increasing it weakens freshness and should be
exceptional.

## Configuration extension

The controller reuses the local `VOID_NODE_FLEET_DRIFT_CONFIG_V1` file. Add an
exact `expected_remote_url` to every node that may be synchronized:

```json
{
  "name": "nimo",
  "transport": "ssh",
  "ssh_target": "<operator SSH alias>",
  "repo": "~/dev/void-node",
  "service": "void-node-live.service",
  "http_base": "http://127.0.0.1:4101",
  "min_peers": 1,
  "expected_remote_url": "git@github.com:6ZoSo9/void-node.git"
}
```

The value must exactly match `git remote get-url origin` on that node. HTTPS is
also valid when it is the node's exact configured URL. Do not place tokens,
passwords, private-key paths, or authorization headers in this file.

V1 requires canonical branch `main`, a non-shallow repository, a clean
worktree, no Git operation in progress, and a numeric-loopback HTTP endpoint.

## Dry run

```bash
node tools/void-node-fleet-source-convergence-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --output "$HOME/.config/void/node-fleet-source-convergence-nimo-plan-v1.json"
```

Dry run performs two fresh read-only checks:

1. `origin/main` from the coordinator must still equal the audited target; and
2. the selected node must still have the audited old SHA, exact `main` branch,
   clean non-shallow repository, expected remote URL, no Git operation in
   progress, active service, green health/readiness, and configured peer floor.

Success emits `READY_TO_APPLY`, a sanitized deterministic `plan_id_sha256`, and
the exact confirmation marker. It does not fetch or change a ref.

## Applied source synchronization

Applied use requires exact, byte-for-byte echoes of:

- operation marker `VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1`;
- audit ID;
- plan ID;
- node name;
- current/source SHA; and
- target SHA.

Whitespace padding and case changes are rejected.

```bash
node tools/void-node-fleet-source-convergence-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --apply \
  --confirm-operation VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1 \
  --confirm-audit-id '<exact audit_id_sha256>' \
  --confirm-plan-id '<exact plan_id_sha256>' \
  --confirm-node nimo \
  --confirm-from-sha '<exact audited old SHA>' \
  --confirm-target-sha '<exact audited target SHA>'
```

The applied command uses fixed Git operations only:

1. repeat the exact clean/head/branch/remote/non-shallow checks;
2. fetch only the configured remote's `refs/heads/main` without tags or
   submodules;
3. require `FETCH_HEAD` to equal the audited target, catching a remote-main
   race before source movement;
4. prove the old SHA is an ancestor of the target;
5. repeat the old-head and clean-worktree checks; and
6. fast-forward with `git merge --ff-only`, with hooks disabled and submodule
   recursion disabled.

There is no pull, reset, checkout, force update, merge commit, branch creation,
stash, cleanup, package install, build, or service action.

## Outcomes

- `SOURCE_SYNCED` — the command returned success and a fresh inspection proved
  the exact target, `main`, clean worktree, and green runtime.
- `SOURCE_SYNCED_RECOVERED_AFTER_TRANSPORT_FAILURE` — the command response was
  lost or failed, but a fresh inspection independently proved the exact target
  and green state.
- `SOURCE_NOT_SYNCED` — fresh inspection proved the original source remained in
  place. A fresh audit is required before another attempt.
- `SOURCE_SYNC_UNKNOWN` — neither exact old nor exact target state could be
  proven. Automatic retry is forbidden.
- `HOLD` — the audit, confirmations, canonical target, or fresh preflight no
  longer matches.

Receipts do not serialize repository paths, SSH targets, or remote URLs.

## Authority boundary

This source lane and its dry run do not perform any node mutation.

The separately confirmed applied mode may fetch Git objects and fast-forward
the selected node's local `main` source only. It does not:

- run `npm`, install packages, or build the source;
- start, stop, reload, or restart a service;
- claim or perform runtime deployment;
- alter Tailscale, Tor, firewall, router, or interface state;
- print or copy credentials, private keys, tokens, or authorization headers;
- access a wallet or signer;
- sign or broadcast a transaction;
- mutate Buy VOID, Work Credits, validator, consensus, or treasury state; or
- move funds.

After a successful source sync, build/restart/deployment and post-deployment
proof remain separate operator actions with separate authorization.


# VOID node fleet process restart controller v1

Marker: `VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1`

## Purpose

Restart exactly one healthy VOID node process after an already-proven source
fast-forward, without turning a source sync into an implicit package install,
build, service-file deployment, or fleet-wide rollout.

The controller is dry-run by default. It emits a deterministic, sanitized plan
only when all evidence still agrees. Applied use is a separate operator gate
and can issue exactly one `systemctl --user restart` for the configured service.

## Required evidence chain

V1 consumes two fresh receipts for the same selected node:

1. a successful `VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1` applied receipt; and
2. a read-only `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` result whose fleet
   decision is `RESTART_REQUIRED` and whose selected node is
   `STALE_SOURCE_AFTER_PROCESS_START` at the converged target SHA, with
   `process_source_identity_required: true` and an exact bound stale-process
   commit/tree identity.

The controller reproduces both receipt digests. It also reproduces the private
source-convergence plan binding from the fleet config, including transport,
repository, expected remote URL, branch, old SHA, and target SHA. A receipt that
claims a build, package install, service action, deployment, or prior restart is
rejected.

Both files must be no older than 300 seconds by default. The limit may be set
from 1 through 3600 seconds with `--max-evidence-age-seconds`; increasing it
weakens the evidence boundary.

## Restart-only source policy

Before planning, the coordinator resolves the current remote `main`, proves the
old SHA is an ancestor of the target, and computes the exact Git path transition.
The same transition is recomputed after the live node preflight.

Restart-only apply is eligible only when:

- at least one changed path is under `src/**` or `public/**`;
- any accompanying evidence path is under `.github/**`, `docs/**`,
  `fixtures/**`, `schemas/**`, `examples/**`, or `scripts/prove_*`; and
- no other path changed.

The following categories always hold for a separate deployment decision:

- dependency or build inputs such as `package.json`, `package-lock.json`,
  `Dockerfile`, `.nvmrc`, and `tsconfig*`;
- `ops/**` and non-proof `scripts/**`, including service launch/install logic;
- `contracts/**`, `config/**`, and `integrations/**`; and
- every unknown or unclassified path.

Evidence-only transitions also hold because they do not justify runtime
disruption. This policy is intentionally conservative: a service restart may
load source already present on disk, but it cannot prove that changed packages,
compiled artifacts, operating-system files, or external configuration were
installed correctly.

## Fresh live preflight

For the selected node, the controller brackets and requires:

- exact target HEAD on exact `main` with a readable clean worktree;
- stable HEAD, worktree status, HEAD-reflog epoch/size, systemd MainPID, and
  process start tuple during collection;
- expected remote URL, non-shallow repository, and no Git operation in progress;
- active configured user-systemd service;
- MainPID cwd at the configured repository;
- Node/Node.js executable and the complete checked-in launcher argv tuple:
  the identity marker plus exact stale commit/tree/main condition arguments,
  repo-local TSX preflight, repo-local TSX loader URL, and absolute
  `src/index.ts`, with no extra application arguments;
- the stale process commit resolves to its claimed tree, is an ancestor of the
  converged source, differs from that source, and exactly matches both the
  freshness receipt and the immutable `/version.process_source` envelope;
- the same stale process start epoch and source transition epoch recorded by
  the freshness audit;
- green numeric-loopback health and readiness with zero readiness gap; and
- the configured live connected-peer floor.

A source move, service change, remote-main advance, dirty worktree, peer loss,
or any contradictory evidence returns `HOLD`. Cached/known addresses do not
count as connected peers.

## Dry run

Run the process freshness audit after source convergence:

```bash
node tools/void-node-fleet-process-freshness-audit-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json"
```

Exit code `3` is the expected positive signal for `RESTART_REQUIRED`; it is not
a collector failure. Exit code `2` means `HOLD`.

Then build a restart plan:

```bash
node tools/void-node-fleet-process-restart-controller-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --source-convergence-receipt "$HOME/.config/void/node-fleet-source-convergence-nimo-result-v1.json" \
  --freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-restart-nimo-plan-v1.json"
```

Success emits `READY_TO_APPLY`, marker
`VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1`, and a deterministic
`plan_id_sha256`. The public plan does not serialize repository paths, SSH
targets, service names, loopback endpoints, or remote URLs. The output file is
created with mode `0600`. Its digest binds the current source commit/tree and
the stale process commit/tree so an old, current-head-substituted, or tampered
identity cannot authorize the restart.

## Applied restart

Applied use requires exact byte-for-byte echoes of:

- operation marker `VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1`;
- freshness audit ID;
- source convergence plan ID;
- restart plan ID;
- node name;
- old/source-convergence SHA;
- current target/source SHA; and
- old process start epoch.

Whitespace padding and case changes are rejected.

```bash
node tools/void-node-fleet-process-restart-controller-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --source-convergence-receipt "$HOME/.config/void/node-fleet-source-convergence-nimo-result-v1.json" \
  --freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-restart-nimo-result-v1.json" \
  --apply \
  --confirm-operation VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1 \
  --confirm-freshness-audit-id '<exact freshness audit_id_sha256>' \
  --confirm-source-plan-id '<exact source convergence plan_id_sha256>' \
  --confirm-restart-plan-id '<exact restart plan_id_sha256>' \
  --confirm-node nimo \
  --confirm-from-sha '<exact old source SHA>' \
  --confirm-source-sha '<exact current source SHA>' \
  --confirm-old-process-start-epoch '<exact old process start epoch>'
```

Immediately before the restart, the remote command repeats the exact HEAD,
branch, clean status, expected remote, non-shallow, no-Git-operation, reflog
epoch, systemd tuple, MainPID cwd/executable/full-launcher-argv, health,
readiness, and peer-floor checks. It brackets those checks against the source
and process tuple again, then executes exactly one:

```bash
systemctl --user restart '<configured-safe.service>'
```

There is no stop/start pair, reload, enablement change, daemon reload, Git
mutation, package command, build command, cleanup, or fallback restart.

After the command, the controller performs bounded read-only polling for up to
30 seconds by default (`--postcheck-seconds`, range 5..120). This is not an
operation retry. Success requires a new process start epoch, the same exact
source commit/tree and reflog transition, `PROCESS_SOURCE_ALIGNED`, a new
process identity envelope bound to that current source, clean source, exact
launcher identity, green health/readiness, and restored connected-peer floor.

## Outcomes and ambiguity

- `PROCESS_RESTARTED` — the command returned success and fresh evidence proves
  the new aligned process and peer floor.
- `PROCESS_RESTARTED_RECOVERED_AFTER_TRANSPORT_FAILURE` — the command transport
  failed or its response was lost, but fresh evidence independently proves the
  new aligned process and peer floor.
- `PROCESS_NOT_RESTARTED` — fresh evidence proves the exact old stale process
  remains.
- `PROCESS_RESTART_UNKNOWN` — neither the exact old process nor a proven new
  aligned process can be established.
- `HOLD` — input, source transition, path policy, canonical target, or live
  preflight is no longer exact.

Automatic retry is always false. Any non-successful applied outcome requires a
fresh source receipt and freshness audit before another decision.

## One node at a time

Each node receives a separate plan and confirmation set. The controller never
continues to another configured machine and never attempts a fleet rollback.
This bounds loss of connectivity and keeps Precision, Nimo, and Alienware
independently inspectable.

## Authority boundary

Dry run and CI perform no node mutation. The live proof uses only a temporary
Git repository, temporary Node process, and simulated user-systemd command.

Separately confirmed applied mode may restart the configured user service on
the selected node only. It does not:

- fetch, merge, checkout, reset, or otherwise mutate Git;
- install packages or build artifacts;
- edit, install, enable, disable, or reload a service definition;
- continue to another node;
- change Tailscale, Tor, DNS, firewall, router, interface, or port-forwarding
  state;
- read or print credentials, private keys, tokens, wallets, or signers;
- sign or broadcast a transaction;
- mutate Buy VOID, Work Credits, validator, consensus, or treasury state; or
- move funds.

The source-convergence apply, restart apply, any broader deployment, and every
real-node invocation remain separate operator authorization gates.

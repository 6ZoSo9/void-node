# VOID node fleet atomic cutover v1

Marker: `VOID_NODE_FLEET_ATOMIC_CUTOVER_V1`

## Purpose

Provide a fail-closed, read-only planner for a future one-node fleet cutover.

The current `void-node-live.service` is rooted directly at `~/dev/void-node`,
and the live process serves `/app/` static files from that checkout. A normal
source fast-forward can therefore change participant-facing files while the old
process is still running.

V1 does **not** perform that mutation. It proves whether one selected node has
enough exact evidence to request a separate cutover authorization.

## Required evidence

The planner requires:

1. a fresh full-fleet `VOID_NODE_FLEET_DRIFT_AUDIT_V1` with the exact configured
   node set/order and no `HOLD`;
2. the selected node is a clean, healthy, ready, live-peered convergence
   candidate;
3. remote `main` still equals the audited target;
4. the selected node's exact Git remote matches the coordinator remote;
5. the running process identity is still bound to the audited old source SHA;
6. a detached clean staged worktree at the exact target, sharing the live
   repository's Git common directory; and
7. all three reviewed target proofs pass:
   - `scripts/prove_void_p2p_udp_swarm_node_runtime_mount_v1.ts`
   - `scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts`
   - `scripts/prove_void_agent_sdk_release_pack_v1.mjs`

The two TypeScript proofs run against the detached target through the existing
executable `node_modules/.bin/tsx` in the live checkout. The stage itself must
not contain or create `node_modules`; all three proofs must leave it clean.

## Transition boundary

V1 uses an explicit default-deny admission policy. Only the following exact
deployed-pin-to-target paths may differ:

- reviewed support/evidence files:
  - `.ci/VCL_LICENSE.txt`
  - `LICENSE`
  - `ops/coordination/worker-coordination-state-v3.json`
  - `public/void-app-wave1-v1/assets/css/site-theme.css`
  - `scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts`
  - `tools/void-worker-coordination-v3.mjs`
- the exact sealed Agent SDK distribution:
  - `integrations/agents/void-agent-sdk-v1/LICENSE`
  - `integrations/agents/void-agent-sdk-v1/README.md`
  - `integrations/agents/void-agent-sdk-v1/cli.mjs`
  - `integrations/agents/void-agent-sdk-v1/index.mjs`
  - `integrations/agents/void-agent-sdk-v1/integrity.json`
  - `integrations/agents/void-agent-sdk-v1/package.json`
- the two reviewed runtime files:
  - `src/p2p/udp_swarm_node_runtime_mount_v1.ts`
  - `src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts`

Every other path is rejected, including unknown root files, `release/**`,
unknown top-level directories, extra `public/**` or `tools/**` paths, and
unlisted files within an otherwise reviewed family. A future target that changes
the admitted set requires a separately reviewed source update before the
planner can return ready.

Nimo may have zero remaining runtime-file delta if the two reviewed files
already exist at its current source head.

## Output

Example dry run:

```bash
node tools/void-node-fleet-atomic-cutover-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --stage-dir "$HOME/dev/void-node-stage-<target-prefix>" \
  --output "$HOME/.config/void-node-fleet-atomic-cutover-nimo-plan-v1.json"
```

A green plan has:

```text
outcome=READY_FOR_SEPARATE_CUTOVER_AUTHORIZATION
mutation_authority_granted=false
```

The deterministic plan ID privately binds the SSH/repository/stage/service/remote
configuration, audit ID, old/target SHAs, old process invocation, process-source
tree, and reviewed path policy. The public plan omits those private transport and
path details.

The plan records the only acceptable later operation order:

1. quiesce the selected service;
2. exact fast-forward to the confirmed target;
3. start that same service once; and
4. prove a new process identity plus health/readiness/peer restoration.

This source lane does not implement or invoke those operations.

## Fleet order

Based on the current observed fleet state, the intended later order is:

```text
Nimo -> Precision -> Alienware
```

A fresh full-fleet audit is required between node cutovers. The planner never
continues automatically to another node.

## Authority boundary

This v1 planner may only read Git/systemd/process/loopback evidence, run isolated
stage proofs, and optionally create one mode-0600 plan file.

It never fetches/merges/checks out/resets a live node, stops/starts/restarts a
service, installs packages, builds, edits service definitions, changes network
configuration, accesses credentials/wallets/signers, mutates validators or Work
Credits, constructs/broadcasts a transaction, or moves funds.

Any live cutover remains a separate explicit operator gate.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.

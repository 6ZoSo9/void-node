# VOID node fleet atomic cutover v1

Marker: `VOID_NODE_FLEET_ATOMIC_CUTOVER_V1`

## Purpose

Provide a fail-closed, read-only planner for a future one-node fleet cutover.
The live `void-node-live.service` process may execute source from the same checkout
that serves participant-facing files, so source and process identity must remain
exact across the entire staging proof interval. V1 produces evidence only; it
never performs the cutover.

## Required evidence

A plan can be ready only when all of these remain exact:

1. a fresh full-fleet `VOID_NODE_FLEET_DRIFT_AUDIT_V1` for the exact configured
   node set/order with no `HOLD`;
2. the selected node is clean, healthy, ready, and above its connected-peer floor;
3. canonical remote `main` equals the audited target both before and after the
   detached-stage proof interval;
4. the selected node's Git remote still matches the coordinator remote;
5. the running MainPID is bound to the configured repository for both local and
   SSH nodes, its executable is Node/Node.js, and its complete checked-in launcher
   argv is exact: immutable process-source marker, commit/tree/main conditions,
   repo-local TSX preflight/loader, and `<repo>/src/index.ts`, with no extra
   application arguments;
6. the process-source commit resolves to the claimed Git tree, remains an
   ancestor of the checked-out source, and `/version.process_source` reproduces
   that immutable commit/tree/main identity;
7. a detached clean staged worktree remains at the exact target and shares the
   live repository's Git common directory before and after all target proofs; and
8. all three reviewed target proofs pass:
   - `scripts/prove_void_p2p_udp_swarm_node_runtime_mount_v1.ts`
   - `scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts`
   - `scripts/prove_void_agent_sdk_release_pack_v1.mjs`.

The two TypeScript proofs execute through the existing live-checkout
`node_modules/.bin/tsx`. The detached stage must not contain or create
`node_modules`, and all proofs must leave it clean.

## Proof-interval stability boundary

The planner deliberately brackets the potentially long detached-stage proof
interval. It samples canonical remote `main` and the selected live process before
the proofs, reruns both checks afterward, and refuses to combine evidence across a
race. The live source HEAD, remote binding, process invocation, process cwd,
Node executable, complete launcher argv, process-source identity, health,
readiness, and peer floor must still be valid; the process identity digest must
be unchanged.

The stage is similarly bracketed. Its HEAD, detached-branch state, Git common
directory, and live-common-directory relationship are recorded before the proofs
and re-read afterward. Any target movement, attachment to a branch, common-dir
change, ignored `node_modules` creation, dirty worktree, or failed proof returns
`HOLD` rather than a ready plan.

This prevents a remote-main advance, service restart/source replacement, wrong
SSH checkout, spoofed partial argv, or concurrent stage checkout from being
combined with stale pre-proof evidence.

## Transition boundary

V1 uses an explicit default-deny admission policy. Only these exact
reviewed deployed-pin-to-target paths may differ:

- reviewed support/evidence:
  - `.ci/VCL_LICENSE.txt`
  - `LICENSE`
  - `ops/coordination/worker-coordination-state-v3.json`
  - `public/void-app-wave1-v1/assets/css/site-theme.css`
  - `scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts`
  - `tools/void-worker-coordination-v3.mjs`
- exact sealed Agent SDK distribution:
  - `integrations/agents/void-agent-sdk-v1/LICENSE`
  - `integrations/agents/void-agent-sdk-v1/README.md`
  - `integrations/agents/void-agent-sdk-v1/cli.mjs`
  - `integrations/agents/void-agent-sdk-v1/index.mjs`
  - `integrations/agents/void-agent-sdk-v1/integrity.json`
  - `integrations/agents/void-agent-sdk-v1/package.json`
- reviewed runtime:
  - `src/p2p/udp_swarm_node_runtime_mount_v1.ts`
  - `src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts`.

Every other path is rejected. A future target whose deployed-pin delta exceeds
this set needs separately reviewed source before this planner can return ready.

## Output

Example:

```bash
node tools/void-node-fleet-atomic-cutover-v1.mjs \
  --node nimo \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --stage-dir "$HOME/dev/void-node-stage-<target-prefix>" \
  --output "$HOME/.config/void-node-fleet-atomic-cutover-nimo-plan-v1.json"
```

A green plan reports:

```text
outcome=READY_FOR_SEPARATE_CUTOVER_AUTHORIZATION
mutation_authority_granted=false
remote_main_stable=true
live_process_identity_stable=true
stage_identity_stable=true
```

The private plan identity binds the config, audit ID, old/target SHAs, exact old
process invocation/tree/identity, stage path, remote binding, and reviewed path
policy. The public receipt omits private host/path transport details.

The only acceptable later operation order is recorded as:

1. quiesce the selected service;
2. exact fast-forward to the confirmed target;
3. start that same service once; and
4. prove a new process identity plus health/readiness/peer restoration.

This source lane does not implement or invoke those operations. A fresh full-fleet
audit remains required between separately authorized node cutovers.

## Authority boundary

V1 may read Git/systemd/process/loopback evidence, run isolated stage proofs, and
optionally create one mode-`0600` plan file. It does not fetch, merge, checkout,
or reset a live node; stop/start/restart a service; install packages; build;
edit service definitions; change networking; access credentials, wallets, or
signers; mutate validators or Work Credits; construct/broadcast a transaction;
or move funds.

Any real cutover remains a separate explicit operator gate.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.
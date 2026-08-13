# VOID Worker Coordination V3

Marker: `VOID_WORKER_COORDINATION_V3`

## Purpose

The existing active-lane registry remains the source of collision evidence for branches, worktrees, paths, pull requests, process references, and static policy. Coordination V3 adds the layer that collision detection does not provide:

- a machine-readable worker roster;
- one canonical lifecycle state per active, parked, held, or frozen lane;
- per-worker work-in-progress limits;
- semantic dependency invalidation when a consumed contract changes without a direct path collision;
- explicit separation of source, merge, deployment, runtime, and external-acceptance gates; and
- a bounded experiment with additional specialized workers.

V3 does not replace Red/Amber/Green path checks. Every source candidate still requires a fresh V1 registry/path check before mutation.

## Files

- `ops/coordination/worker-roster-v1.json` defines workers, jobs, lane families, authority exclusions, and WIP limits.
- `ops/coordination/worker-coordination-state-v3.json` records the point-in-time canonical lane map and capability-gate state.
- `tools/void-worker-coordination-v3.mjs` strictly validates both files and emits a read-only canonical status summary.
- `scripts/prove_void_worker_coordination_v3.mjs` proves the checked-in state and adversarial rejection behavior.
- `.github/workflows/void-worker-coordination-v3.yml` runs the proof on Node.js 22, 24, and 26.

## Worker expansion experiment

Three workers are added for the first bounded experiment.

### Ada

Ada owns semantic coordination:

- consumed-contract and dependency tracking;
- lifecycle state and WIP-limit validation;
- capability-gate separation; and
- detection of source lanes that require review after a semantic dependency changes.

Ada's first lane is this Coordination V3 implementation.

### Grace

Grace owns CI topology and efficiency:

- workflow, trigger, path-filter, runner, matrix, and recent-run inventory;
- focused-check versus integration-wall classification;
- evidence-based identification of redundant fan-out; and
- safe consolidation proposals that preserve required security, economic, networking, compatibility, release, and authority checks.

Grace's first lane is tracked by issue #1237. It begins read-only. No required check may be deleted, disabled, or weakened merely to reduce run count.

### Shannon

Shannon owns capability and acceptance truth:

- exact distinction between source-green, merged, deployed, runtime-green, and externally accepted;
- evidence binding to exact source and runtime identities;
- tracking-state mismatch detection; and
- prevention of issue closure when required external gates remain unproven.

Shannon's first lane is reopened issue #1005. It remains open until its ordinary-machine, independent-failure-domain N-1 acceptance contract is actually satisfied.

## Source main versus deployed runtime pin

`state.main_sha` records the current repository source anchor. It is not automatically the commit that every running node must execute.

The current source anchor is:

`fb5ee3593c3040921a09548d8da2f7d876321b85`

The three-box rollout separately proved and deployed the intentionally pinned runtime:

`58443d5c615814152dac3a370ccda82e36083846`

Nimo, Precision, and Alienware were verified healthy on that runtime pin. Later unrelated source-only changes on `main` do not invalidate that deployed runtime truth and do not create automatic restart or convergence authority.

The fleet lane therefore records the rollout gates as green and remains `ACTIVE_RESEARCH` only for read-only stability and source-drift evidence. A future source convergence or service restart is a new operator gate; it is not implied merely because `main` advances.

This distinction prevents two opposite truth failures:

- treating an undeployed source commit as if it were live; and
- treating a proven live runtime as stale merely because unrelated source work merged later.

## Lifecycle classes

### Active

- `ACTIVE_SOURCE` — bounded source mutation on one canonical branch.
- `ACTIVE_OPERATOR` — separately authorized operator sequence; it does not imply source authority elsewhere.
- `ACTIVE_RESEARCH` — read-only audit or evidence work anchored to a tracking issue.

Each worker's `max_active_lanes` is enforced. An active source lane must name its branch. An active research/operator lane must at least name a tracking issue.

### Parked or review required

- `PARKED` — useful lane intentionally waiting for a concrete trigger.
- `HELD` — known blocker prevents progress.
- `REVIEW_REQUIRED` — a dependency, current-main assumption, or consumed contract changed and the lane requires fresh review.
- `FROZEN_STACK` — multiple dependent pull requests are represented as one parent-first lane instead of many independent active lanes.

Parked and held lanes require explicit reasons. `REVIEW_REQUIRED` requires concrete invalidation evidence. A frozen stack must contain at least two ordered pull requests and only its current root may advance.

### Terminal

- `COMPLETE`
- `SUPERSEDED`

A terminal lane is rejected unless every gate listed in `required_gates` is exactly `true`.

## Capability gate order

V3 fixes the order:

1. `source_green`
2. `merged`
3. `deployed`
4. `runtime_green`
5. `external_accepted`

A later gate cannot be true while an earlier gate is false or unknown. Closing a tracked issue while any required gate remains incomplete is rejected.

This prevents source implementation or a successful merge from being treated as deployment or external acceptance.

The reopened #1005 lane remains a separate capability truth surface. The base fleet runtime being green does not prove that #1005's multipath/bootstrap capability is deployed, runtime-green, or independently accepted. Those gates stay false until evidence for that specific capability exists.

## Semantic invalidation and resolution

Path disjointness does not prove semantic compatibility. A lane may consume an exported function, schema, release root, authorization wrapper, execution policy, or acceptance contract that later changes on another path.

Each lane may therefore record `semantic_dependencies`. When a required dependency changes, the lane enters `REVIEW_REQUIRED` with `invalidated_by` evidence.

PR #1231 is the current resolution example. Merged PR #1233 established the signed-observer authorization boundary for public discovery. #1231 was reconciled to `composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1`, proved hostile authenticated peers cannot become topology authority, and then merged into `main`.

That source lane is now `PARKED`, not `REVIEW_REQUIRED`:

- `source_green=true`;
- `merged=true`;
- `deployed=false`;
- `runtime_green=false`; and
- `external_accepted=false`.

Publication of an active release root, signed observer set, relay-introduction artifacts, live dependency wiring, deployment, runtime activation, and independent external acceptance remain separate gates.

## WIP and stack compression

Workers normally have at most one active lane and one parked lane. Roster-specific exceptions are explicit rather than implicit.

Moe currently has two parked obligations:

- merged #1231 is operationally parked behind publication/deployment/acceptance gates; and
- the older relay-retirement stack remains frozen parent-first.

The older stack is represented once:

`#1132 -> #1134 -> #1137 -> #1139 -> (#1140 + #1141) -> #1144 -> #1146`

It does not count as eight independently active jobs. Only the current root is actionable after a fresh current-main review.

## Exact-head evidence rule

The checked-in coordination state must not claim its own source lane green before the exact-head proof has run.

During a reconciliation commit, `worker-coordination-v3-experiment.gates.source_green` stays `false`. After the exact branch head passes the Coordination V3 and exploration-extension matrices on Node.js 22, 24, and 26, a later evidence-seal commit may set it to `true`.

This keeps the coordination layer subject to the same truth discipline that it imposes on other lanes.

## Commands

Validate and print status:

```bash
node tools/void-worker-coordination-v3.mjs validate
```

Write a canonical JSON summary:

```bash
node tools/void-worker-coordination-v3.mjs status \
  --roster ops/coordination/worker-roster-v1.json \
  --state ops/coordination/worker-coordination-state-v3.json \
  --output /tmp/void-worker-coordination-v3.json
```

Run the adversarial proof:

```bash
node scripts/prove_void_worker_coordination_v3.mjs
```

## Point-in-time boundary

The checked-in state is a reviewed snapshot, not a distributed scheduler or lock. Workers must refresh current `main`, open pull requests, reviews, checks, changed paths, issue states, consumed contracts, and recent writes before mutation. Live V1 Red evidence always overrides an older V3 snapshot.

When current reality differs from the state file, the correct response is to update the lane state or emit `HOLD`; do not reinterpret stale metadata as authority.

## Authority boundary

Coordination V3 performs validation and status reporting only. It grants no deployment, restart, router/firewall/DNS/interface mutation, credential/private-key access, release signing, wallet/signer use, payment, Work Credit mutation, validator action, transaction, treasury action, liquidity action, or funds movement.

`PROTECT THE CORE`.

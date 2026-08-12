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

Three workers are added for the first bounded experiment:

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

Shannon's first lane is reopened issue #1005. It remains open until its ordinary-machine, independent-failure-domain N−1 acceptance contract is actually satisfied.

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

This prevents source implementation or a successful merge from being treated as deployment or external acceptance. The reopened #1005 lane records the current truth: source and merge gates are green, while deployment, runtime, and external N−1 acceptance remain false.

## Semantic invalidation

Path disjointness does not prove semantic compatibility. A lane may consume an exported function, schema, release root, authorization wrapper, execution policy, or acceptance contract that later changes on another path.

Each lane may therefore record `semantic_dependencies`. When a required dependency changes, the lane enters `REVIEW_REQUIRED` with `invalidated_by` evidence.

The current example is PR #1231. It remains the canonical public relay-introduction collector, but merged PR #1233 established the signed-observer authorization boundary for public discovery. #1231 must integrate and prove that boundary before its source-green state can be restored.

## WIP and stack compression

Workers normally have at most one active lane and one parked lane. A temporary roster-specific exception is explicit rather than implicit; Moe currently has two parked items because the held collector and the older eight-PR relay-retirement stack are distinct obligations.

The older stack is represented once:

`#1132 -> #1134 -> #1137 -> #1139 -> (#1140 + #1141) -> #1144 -> #1146`

It does not count as eight independently active jobs. Only the current root is actionable after a fresh current-main review.

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

The checked-in state is a reviewed snapshot, not a distributed scheduler or lock. Workers must refresh current `main`, open pull requests, reviews, checks, changed paths, issue states, and recent writes before mutation. Live V1 Red evidence always overrides an older V3 snapshot.

When current reality differs from the state file, the correct response is to update the lane state or emit `HOLD`; do not reinterpret stale metadata as authority.

## Authority boundary

Coordination V3 performs validation and status reporting only. It grants no deployment, restart, router/firewall/DNS/interface mutation, credential/private-key access, release signing, wallet/signer use, payment, Work Credit mutation, validator action, transaction, treasury action, or funds movement.

`PROTECT THE CORE`.

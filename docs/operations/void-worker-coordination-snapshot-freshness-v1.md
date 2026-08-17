# VOID Worker Coordination Snapshot Freshness V1

Marker: `VOID_WORKER_COORDINATION_SNAPSHOT_FRESHNESS_V1`

Companion marker: `VOID_WORKER_LIVE_DISPATCH_V1`

## Purpose

Coordination V3 stores a reviewed point-in-time lane snapshot. Live GitHub facts may move after that snapshot without making the static file malformed. The V3 validator can therefore correctly return `valid=true` for a structurally valid historical snapshot even when current `main`, pull-request lifecycle, reviews, checks, issue state, recent writes, worker scheduling, or actual worker execution evidence have changed.

The snapshot-freshness helper makes that boundary machine-readable. It does not replace the V3 validator, the V1 Red/Amber/Green collision registry, or live GitHub inspection. It consumes the checked-in V3 roster/state plus an independently observed current `main` SHA and reports whether the snapshot's source anchor still matches that observation.

The companion live-dispatch evaluator closes the separate non-idle assignment gap. It composes all 15 current scheduled workers, validates one bounded fallback for every worker, consumes a closed live-evidence packet, and emits exactly one deterministic dispatch recommendation per worker. It does not invoke workers or grant source, merge, deployment, scheduler, credential, wallet, signer, Work Credit, validator, transaction, treasury, liquidity, or funds authority.

## Snapshot truth boundary

A real coordination snapshot may still list a canonical PR as `ACTIVE_SOURCE` after that PR has merged and moved `main`. It may also list a worker as active even when no independent live evidence shows that worker is currently executing or reporting. Neither condition is live capacity proof.

V1 makes the distinction explicit:

- `MAIN_ANCHOR_MATCH_POINT_IN_TIME` means the supplied observed `main` equals `state.main_sha`; the lane map is still point-in-time only and live refresh remains required before mutation.
- `STALE_SNAPSHOT_LIVE_REFRESH_REQUIRED` means observed `main` differs from `state.main_sha`; current-main assumptions and every canonical PR/tracking issue in the snapshot must be reread before mutation.
- `snapshot.worker_capacity_scope=nominal_roster_only` means static roster membership is not proof that a worker is actually executing or producing current evidence.
- `worker_execution_report_evidence_required=true` means live worker/report evidence must be refreshed independently before counting a named worker as available capacity.
- `live_plan_workers_not_modeled_by_snapshot_require_external_evidence=true` means a worker named only by current issue coordination is also not proven active merely because the issue assigns work.

The checked-in V3 roster/state are therefore historical coordination evidence, not a scheduler inventory. The current live-dispatch policy and the external scheduled-task configuration may intentionally differ from that older point-in-time snapshot.

These fields are evidence only. They do not grant source or runtime authority.

## Fifteen-worker live composition

`ops/coordination/worker-live-dispatch-policy-v1.json` validates the current externally scheduled composition in three explicit layers:

- base scheduled workers: Larry, Curly, Moe, Satoshi, Turing, Ada, Grace, and Shannon;
- Exploration Extension V1 workers: Hopper, Lamarr, and Darwin; and
- supplemental scheduled workers: Dijkstra, Katherine, Keller, and Feynman.

Ren is deliberately not part of the externally scheduled/hourly worker set. Ren is an interactive coordinator identity used when ZoSo and the assistant are working together; static historical V3 references to Ren do not create an hourly dispatch slot.

The policy requires exactly 15 unique scheduled workers and exactly one worker-specific bounded fallback per worker. Every fallback has a tracking issue, ranked exploration domains, a sensitivity classification, and an explicit negative authority boundary. The live coordination plan is issue #1301; historical references to archived #1182 remain historical evidence only.

Fallback coverage is unconditional. A worker keeps its fallback definition even while its primary specialty is active. Worker roles are first-look specialties rather than permanent exclusive identities: when the specialty is blocked, parked, adequately occupied, requires unavailable authority, or has no meaningful safe action, the worker may fall through to the highest-value genuinely unowned Green or bounded Amber source-only work and should return to the specialty when it becomes the highest-value actionable lane again.

The policy preserves the existing noise limits:

- at most one open exploration issue per worker;
- at most one open exploration draft PR per worker;
- a ranked candidate before branch creation;
- a fresh collision check before source mutation;
- no automatic issue or PR creation; and
- no automatic merge authority.

## Control-plane comment discipline

Issue #1301 is a live state index, not an hourly worker transcript. Routine `STARTED`, heartbeat, `still blocked`, `no change`, and CI-poll comments do not belong there. Detailed attributable execution evidence belongs on the worker's lane issue or relevant pull request. A #1301 comment is appropriate only when ownership, blockers, collision state, dependencies, lifecycle, reassignment, or the authoritative priority queue materially changes; one consolidated material update is preferred over separate start/result chatter.

## Thirty-minute liveness contract

The live-dispatch evaluator uses an explicit `evaluated_at` timestamp supplied in its closed evidence packet. It computes:

- `reevaluation_interval_minutes=30`;
- `next_reevaluation_at=evaluated_at+30 minutes`; and
- `execution_evidence_max_age_minutes=30`.

A primary lane claiming `RUNNING` may be continued only when its execution evidence is no older than 30 minutes and no hard collision is reported. Stale or missing execution evidence produces `REFRESH_PRIMARY_EVIDENCE`, not an assumption that work is still happening and not an automatic competing source lane.

A running lane that acquires a hard collision produces `REVALIDATE_PRIMARY_COLLISION`. An actionable, non-hard-blocked primary produces `TAKE_PRIMARY_NEXT_ACTION`, but the result still fixes `source_mutation_authorized=false`; the worker must already possess separate authority and must refresh collision evidence before mutation.

Waiting, parked, frozen, complete, absent, or hard-blocked primaries fall through to worker-specific bounded research. When the worker-specific fallback is itself hard-blocked or its tracking issue is unavailable, the evaluator assigns the universal read-only repository-evidence refresh instead of leaving the worker unassigned.

Exploration progress older than the checked-in seven-day stale window produces `REFRESH_STALE_FALLBACK_EVIDENCE`. Missing fallback progress produces `BEGIN_BOUNDED_FALLBACK_RESEARCH`. Fresh fallback evidence produces `CONTINUE_BOUNDED_FALLBACK_RESEARCH`.

## Honest non-idle claim

A successful evaluation guarantees only:

```text
workers_without_dispatch=[]
no_unassigned_worker_when_evaluated=true
```

It explicitly reports:

```text
continuous_execution_guaranteed=false
external_worker_invocation_required=true
```

The repository does not contain a distributed scheduler and cannot keep ChatGPT sessions, Codex jobs, or other external workers continuously executing. An external runner must invoke the evaluator and then invoke each worker. The checked-in 30-minute contract tells that runner when the next evaluation is due and prevents stale execution claims from being counted as fresh capacity.

## Run snapshot freshness

Use an exact independently observed current-main SHA:

```bash
node tools/void-worker-coordination-snapshot-freshness-v1.mjs \
  --observed-main-sha '<exact current main SHA>'
```

Optional paths:

```bash
node tools/void-worker-coordination-snapshot-freshness-v1.mjs \
  --roster ops/coordination/worker-roster-v1.json \
  --state ops/coordination/worker-coordination-state-v3.json \
  --observed-main-sha '<exact current main SHA>' \
  --output /tmp/void-worker-coordination-snapshot-freshness-v1.json
```

The optional output file is create-only and mode `0600`.

## Run live dispatch

The live evidence packet is read from standard input. It must use marker `VOID_WORKER_LIVE_DISPATCH_EVIDENCE_V1`, exact closed schemas, the exact 15-worker scheduled set, canonical timestamps, a current-main SHA, normalized primary states/collisions, and bounded fallback evidence.

```bash
node tools/void-worker-coordination-live-dispatch-v1.mjs --pretty \
  < /path/to/live-worker-evidence.json
```

Optional policy and create-only output paths:

```bash
node tools/void-worker-coordination-live-dispatch-v1.mjs \
  --policy ops/coordination/worker-live-dispatch-policy-v1.json \
  --output /tmp/void-worker-live-dispatch-v1.json \
  --pretty \
  < /path/to/live-worker-evidence.json
```

The optional output file is create-only and mode `0600`. Standard input is bounded to 1 MiB.

## Dispatch input states

Each worker supplies one normalized primary state:

- `RUNNING`;
- `ACTIONABLE`;
- `WAITING_REVIEW`;
- `WAITING_AUTHORITY`;
- `WAITING_DEPENDENCY`;
- `WAITING_EVENT`;
- `PARKED`;
- `FROZEN`;
- `COMPLETE`;
- `BLOCKED_RED`; or
- `NONE`.

Collision state is exactly `CLEAR`, `ADVISORY`, or `HARD_STOP`. `BLOCKED_RED` requires `HARD_STOP`. Future-dated evidence, unknown workers, duplicate workers, missing workers, unknown fields, malformed timestamps, and a draft exploration PR without an open tracking issue fail closed.

## Output truth

The dispatch result is content-addressed and recursively immutable. It includes:

- exact evaluation and next-reevaluation timestamps;
- one content-addressed dispatch per worker;
- decision counts;
- exact worker and dispatch counts;
- `workers_without_dispatch`;
- the no-unassigned invariant;
- stale execution-evidence classification;
- whether a primary or fallback was selected;
- whether an existing authority gate is still required; and
- explicit false source/runtime/automatic-issue/automatic-PR/automatic-merge/general authority fields.

The evaluator sorts workers by canonical worker ID before deriving dispatch and evaluation identifiers. Reordering equivalent input evidence does not change the result.

## Exit codes

Snapshot freshness:

- `0` — snapshot main anchor matches the supplied observed main. Live PR/review/issue/write/worker/collision refresh is still required before mutation.
- `3` — stale snapshot main anchor. This is the expected positive stale signal, not mutation authority.
- `2` — malformed input, missing arguments, invalid base coordination state, or output failure.

Live dispatch:

- `0` — the complete evidence packet produced one dispatch per worker;
- `2` — malformed policy/evidence, missing or duplicate workers, stale-schema violation, unsafe authority claim, input overflow, or output failure.

## Verification

```bash
node scripts/prove_void_worker_coordination_snapshot_freshness_v1.mjs
node scripts/prove_void_worker_coordination_live_dispatch_v1.mjs
```

The focused workflow runs syntax, both proofs, and the existing V3 validator on Node.js 22, 24, and 26. It adds no scheduled worker invocation and no autonomous mutation path.

## Authority boundary

These tools are read-only coordination evidence and recommendations. Apart from optional local create-only JSON results, they perform no repository mutation, branch creation, issue or pull-request creation, merge, deployment, scheduler invocation, service action, network mutation, credential access, wallet/signer use, validator or Work Credit mutation, transaction action, treasury/liquidity action, or funds movement.

A stale snapshot does not authorize automatic reconciliation. A matching snapshot does not authorize source mutation. A dispatch recommendation does not create authority. Nominal worker membership does not prove active capacity. Live GitHub, independent worker evidence, external invocation, and fresh V1 Red/Amber/Green evidence remain mandatory.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.

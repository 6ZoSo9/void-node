# VOID Worker Coordination Snapshot Freshness V1

Marker: `VOID_WORKER_COORDINATION_SNAPSHOT_FRESHNESS_V1`

## Purpose

Coordination V3 stores a reviewed point-in-time lane snapshot. Live GitHub facts may move after that snapshot without making the static file malformed. The V3 validator can therefore correctly return `valid=true` for a structurally valid historical snapshot even when current `main`, pull-request lifecycle, reviews, checks, issue state, recent writes, or actual worker execution evidence have changed.

This helper makes that boundary machine-readable. It does not replace the V3 validator, the V1 Red/Amber/Green collision registry, or live GitHub inspection. It consumes the checked-in V3 roster/state plus an independently observed current `main` SHA and reports whether the snapshot's source anchor still matches that observation.

The helper never treats a matching source anchor as proof that lane lifecycle or worker capacity is live. Before source mutation, workers must still reread current pull-request state/head/base, changed paths, reviews/checks, tracking issues, recent writes, worker execution/report evidence, and fresh V1 collision evidence.

## Why this exists

A real coordination snapshot may still list a canonical PR as `ACTIVE_SOURCE` after that PR has merged and moved `main`. It may also list a worker as active even when no independent live evidence shows that worker is currently executing or reporting. Neither condition should be converted into live capacity automatically.

V1 makes the distinction explicit:

- `MAIN_ANCHOR_MATCH_POINT_IN_TIME` means the supplied observed `main` equals `state.main_sha`; the lane map is still point-in-time only and live refresh remains required before mutation.
- `STALE_SNAPSHOT_LIVE_REFRESH_REQUIRED` means observed `main` differs from `state.main_sha`; current-main assumptions and every canonical PR/tracking issue in the snapshot must be reread before mutation.
- `snapshot.worker_capacity_scope=nominal_roster_only` means static roster membership is not proof that a worker is actually executing or producing current evidence.
- `worker_execution_report_evidence_required=true` means live worker/report evidence must be refreshed independently before counting a named worker as available capacity.
- `live_plan_workers_not_modeled_by_snapshot_require_external_evidence=true` means a worker named only by current issue coordination is also not proven active merely because the issue assigns work.

These fields are evidence only. They do not grant source or runtime authority.

## Run

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

## Output truth

The result contains:

- snapshot and observed main SHAs;
- `main_anchor_matches` and `main_refresh_required`;
- `snapshot.lifecycle_scope=point_in_time_only`;
- `snapshot.worker_capacity_scope=nominal_roster_only`;
- `live_refresh_required_before_mutation=true` unconditionally;
- the fixed live fact classes that must be reread before mutation, including worker execution/report evidence;
- every canonical PR represented by the snapshot, with its snapshot lane state;
- every tracked issue represented by the snapshot;
- every static-roster worker ID that requires independent live execution evidence before being counted as active capacity;
- an explicit rule that current-plan workers absent from the static snapshot still require external live evidence; and
- explicit false source/runtime/merge/deployment/general authority fields.

The helper does not query GitHub or independently verify that a worker is running. It only makes the evidence requirement explicit. A current issue report, automation receipt, or another reviewed live source may provide that evidence outside this helper when bound to the worker and current coordination state.

The helper first runs the complete Coordination V3 validator. Invalid roster/state input is `HOLD`; snapshot freshness never launders malformed base coordination data.

## Exit codes

- `0` — snapshot main anchor matches the supplied observed main. Live PR/review/issue/write/worker/collision refresh is still required before mutation.
- `3` — stale snapshot main anchor. This is the expected positive stale signal, not mutation authority.
- `2` — malformed input, missing arguments, invalid base coordination state, or output failure.

## Authority boundary

This is read-only coordination evidence. Apart from an optional local create-only JSON result, it performs no repository mutation, merge, deployment, service action, network mutation, credential access, wallet/signer use, validator or Work Credit mutation, transaction action, treasury/liquidity action, or funds movement.

A stale snapshot does not authorize automatic reconciliation. A matching snapshot does not authorize source mutation. Nominal worker membership does not prove active capacity. Live GitHub plus independent worker evidence and fresh V1 Red/Amber/Green evidence remain mandatory.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.

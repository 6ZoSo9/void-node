# VOID Worker Coordination Snapshot Freshness V1

Marker: `VOID_WORKER_COORDINATION_SNAPSHOT_FRESHNESS_V1`

## Purpose

Coordination V3 intentionally stores a reviewed point-in-time lane snapshot. Live GitHub facts may move after that snapshot without making the static file malformed. The V3 validator can therefore correctly return `valid=true` for a structurally valid historical snapshot even when current `main`, pull-request lifecycle, reviews, checks, issue state, or recent writes have changed.

This helper makes that boundary machine-readable. It does not replace the V3 validator, the V1 Red/Amber/Green collision registry, or live GitHub inspection. It consumes the checked-in V3 roster/state plus an independently observed current `main` SHA and reports whether the snapshot's source anchor still matches that observation.

The helper never treats a matching source anchor as proof that lane lifecycle is live. Before source mutation, workers must still reread current pull-request state/head/base, changed paths, reviews/checks, tracking issues, recent writes, and fresh V1 collision evidence.

## Why this exists

A real coordination snapshot may still list a canonical PR as `ACTIVE_SOURCE` after that PR has merged and moved `main`. That is not a reason to rewrite the state file after every merge or create a self-referential reconciliation loop. It is a reason to stop treating the snapshot as a live scheduler.

V1 makes the distinction explicit:

- `MAIN_ANCHOR_MATCH_POINT_IN_TIME` means the supplied observed `main` equals `state.main_sha`; the lane map is still point-in-time only and live refresh remains required before mutation.
- `STALE_SNAPSHOT_LIVE_REFRESH_REQUIRED` means observed `main` differs from `state.main_sha`; current-main assumptions and every canonical PR/tracking issue in the snapshot must be reread before mutation.

The stale result is evidence, not an error and not authority to edit, merge, deploy, restart, or reconcile any lane automatically.

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
- `live_refresh_required_before_mutation=true` unconditionally;
- the fixed live fact classes that must be reread before mutation;
- every canonical PR represented by the snapshot, with its snapshot lane state;
- every tracked issue represented by the snapshot; and
- explicit false source/runtime/merge/deployment/general authority fields.

The helper first runs the complete Coordination V3 validator. Invalid roster/state input is `HOLD`; snapshot freshness never launders malformed base coordination data.

## Exit codes

- `0` — snapshot main anchor matches the supplied observed main. Live PR/review/issue/write/collision refresh is still required before mutation.
- `3` — stale snapshot main anchor. This is the expected positive stale signal, not mutation authority.
- `2` — malformed input, missing arguments, invalid base coordination state, or output failure.

## Authority boundary

This is read-only coordination evidence. Apart from an optional local create-only JSON result, it performs no repository mutation, merge, deployment, service action, network mutation, credential access, wallet/signer use, validator or Work Credit mutation, transaction action, treasury/liquidity action, or funds movement.

A stale snapshot does not authorize automatic reconciliation. A matching snapshot does not authorize source mutation. Live GitHub plus fresh V1 Red/Amber/Green evidence remain mandatory.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.

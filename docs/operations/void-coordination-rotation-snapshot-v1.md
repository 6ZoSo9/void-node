# VOID Coordination Rotation Snapshot V1

Marker: `VOID_COORDINATION_ROTATION_SNAPSHOT_V1`

## Purpose

#1507's coordination contract requires a single compact successor when the control-plane issue reaches its rotation boundary. The successor-chain resolver proves whether rotation is due, but it does not prepare the current structural facts Ada needs before creating that one successor.

This tool creates a **read-only rotation preparation snapshot**. It composes:

- a `VOID_COORDINATION_SUCCESSOR_CHAIN_V1` result;
- the checked-in validated 15-worker live-dispatch policy;
- an independently observed current `main` SHA; and
- an explicit bounded open-pull-request census.

It never creates or edits the successor issue. Ada remains the single rollover writer.

## Honest scope

The snapshot deliberately does **not** claim that open pull requests are a complete ownership map.

It always emits:

```text
ownership_scope=open_pull_requests_only
ownership_complete=false
issue_lane_refresh_required=true
dependency_graph_refresh_required=true
recent_coordination_comment_refresh_required=true
open_issue_refresh_required=true
```

A branch can be reserved before a PR exists, an issue may own blocked work without source WIP, and dependency state can change after the PR census. Ada must refresh those surfaces before converting the packet into successor-body prose.

## Evidence input

The CLI reads one closed JSON object from standard input:

```json
{
  "marker": "VOID_COORDINATION_ROTATION_SNAPSHOT_EVIDENCE_V1",
  "version": 1,
  "observed_main_sha": "<40-char lowercase SHA>",
  "chain": {
    "...": "VOID_COORDINATION_SUCCESSOR_CHAIN_V1 output"
  },
  "open_pull_requests": [
    {
      "number": 2290,
      "title": "example",
      "draft": true,
      "head_sha": "<40-char lowercase SHA>",
      "base_sha": "<40-char lowercase SHA>",
      "updated_at": "2026-10-01T19:20:12.000Z",
      "changed_paths": [
        "tools/example.mjs"
      ]
    }
  ]
}
```

Open PR numbers must be unique. Each changed path must be repository-relative, normalized, and unique within the PR. Input is bounded to 4 MiB, at most 250 open PRs, and at most 500 changed paths per PR.

The live-dispatch policy is read from:

```text
ops/coordination/worker-live-dispatch-policy-v1.json
```

unless `--policy` supplies another path.

## Outcomes

### `ROTATION_PREPARATION_READY`

Requires:

- structurally valid successor chain;
- chain outcome `ROTATION_REQUIRED`;
- terminal issue already at or beyond 250 total issue messages;
- policy repository equals chain repository;
- checked-in policy `plan_issue` still equals the currently overdue hub.

The packet then records the current hub counts, 15-worker roster, open PR census, and the exact fields Ada still must refresh manually.

`rotation_preparation_ready=true` is not successor creation authority.

### `SUCCESSOR_ALREADY_RESOLVED`

The chain already points to a successor. The packet reports whether the checked-in dispatch policy still references the predecessor through:

```text
policy_plan_issue_rebind_required=true
```

This state does not authorize another successor.

### `ROTATION_NOT_DUE`

The current hub is structurally valid and below the rotation boundary.

### `HOLD_POLICY_PLAN_ISSUE_MISMATCH`

Rotation is due, but the checked-in dispatch policy no longer names the chain's current terminal issue. Ada must resolve that discrepancy before using the packet.

### `HOLD_INVALID_SUCCESSOR_CHAIN`

The supplied successor-chain evidence is structurally invalid.

## Snapshot contents

The packet records:

- exact observed `main` SHA;
- root/current coordination issue;
- current hub comment and total-message counts;
- chain outcome and rotation state;
- checked-in dispatch-policy issue identity;
- all 15 scheduled workers with cohort, tracking issue, fallback lane/priority, sensitivity, and exploration domains;
- every supplied open PR with exact head/base, draft state, update timestamp, normalized changed paths, path count, and path-list SHA-256;
- a suggested successor section guide matching #1507's rollover contract.

The section guide is organization metadata only. The tool never generates authoritative successor prose.

## Run

First produce a fresh successor-chain receipt using the merged resolver. Separately collect an exact open-PR evidence packet from live GitHub, then run:

```bash
node tools/void-coordination-rotation-snapshot-v1.mjs \
  --pretty \
  < /path/to/rotation-evidence.json
```

Optional create-only output:

```bash
node tools/void-coordination-rotation-snapshot-v1.mjs \
  --output "$HOME/Downloads/void-coordination-rotation-snapshot-v1.json" \
  --pretty \
  < /path/to/rotation-evidence.json
```

Output files are create-only and mode `0600`.

## Deterministic proof

```bash
node scripts/prove_void_coordination_rotation_snapshot_v1.mjs
```

The proof loads the real checked-in 15-worker policy and covers:

- rotation preparation at the 250-message boundary and above;
- exact roster composition;
- deterministic open-PR/path normalization;
- successor-resolved policy rebinding signal;
- not-due state;
- invalid-chain HOLD;
- stale policy issue HOLD;
- negative authority enforcement;
- duplicate PR rejection;
- unsafe path rejection; and
- strict evidence schema.

The focused workflow is also triggered by changes to the successor-chain tool, live-dispatch validator, or live-dispatch policy so upstream interface drift re-runs this proof.

## Authority boundary

Every snapshot fixes the following false:

```text
successor_body_generation_authorized=false
successor_issue_creation_authorized=false
predecessor_issue_close_authorized=false
predecessor_issue_lock_authorized=false
comment_post_authorized=false
scheduler_mutation_authorized=false
source_mutation_authorized=false
runtime_mutation_authorized=false
automatic_merge_authorized=false
authority_granted=false
mutation_performed=false
```

No issue creation/comment/close/lock, scheduler invocation or cadence mutation, source mutation authorization, deployment, runtime/network action, credential/key/wallet/signer access, transaction construction/signing/submission, validator or Work Credit mutation, treasury/liquidity action, or funds movement follows from this packet.

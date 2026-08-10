# VOID PR Path Collision Audit V1

## Purpose

VOID development frequently has many open pull requests and multiple workers moving
in parallel. Exact branch-stack dependency is only one collision class. Two
unrelated PRs can also modify the same repository path and silently invalidate
each other's assumptions even when neither PR is based on the other.

This lane adds a read-only, fail-closed exact-path collision audit. It complements
`VOID PR Stack Dependency Audit V1`; it does not replace the parent/child movement
guard.

## Files

- `tools/void-pr-path-collision-audit-v1.mjs` reads open GitHub PR metadata and
  complete paginated changed-file lists.
- `scripts/prove_void_pr_path_collision_audit_v1.mjs` proves exact overlap,
  rename, stack-relation, stale-head, and incomplete-input behavior.
- `.github/workflows/void-pr-path-collision-audit-v1.yml` runs the proof,
  self-audits this PR, and exposes manual PR/candidate-path audits.

## Exact path model

The audit compares exact repository paths. Prefix similarity does not count:

```text
src/node.ts
src/node.ts.extra
```

are different paths.

For a renamed file, both the current `filename` and GitHub's
`previous_filename` are treated as touched paths. This prevents a PR that edits
the old name from being incorrectly declared disjoint from a PR that renames it.

The GitHub files endpoint is read with pagination. V1 fails closed if a PR reaches
GitHub's 3,000-file changed-file ceiling instead of claiming a complete path set.

## Candidate-path mode

Workers can check a proposed additive lane before opening a PR:

```bash
node tools/void-pr-path-collision-audit-v1.mjs \
  --repo 6ZoSo9/void-node \
  --candidate-path ".github/workflows/example-v1.yml" \
  --candidate-path "tools/example-v1.mjs" \
  --output "/tmp/void-pr-path-collision-audit.json"
```

Every open PR is inspected. Any exact touched-path overlap returns:

```text
decision=HOLD_OPEN_PR_PATH_COLLISIONS
```

No overlap returns:

```text
decision=SAFE_NO_OPEN_PR_PATH_COLLISIONS
```

Candidate-path mode is deliberately conservative because no PR ancestry exists
yet to establish that an overlap is intentional.

## Existing-PR mode

An open PR can be audited with an optional exact head binding:

```bash
node tools/void-pr-path-collision-audit-v1.mjs \
  --repo 6ZoSo9/void-node \
  --pr-number 1234 \
  --expected-head "<exact-40-hex-head-sha>" \
  --output "/tmp/void-pr-path-collision-audit.json"
```

The audit builds an exact open-PR branch graph. An overlap with a transitive
ancestor or descendant is reported as `stack_related_overlaps`. It remains
visible because same-file stacked work still deserves coordination, but it is
not mislabeled as an unrelated-worker collision.

Sibling PRs are **not** treated as ancestor/descendant. A sibling touching the
same path is an unrelated collision and causes a hold.

Any unrelated overlap, expected-head mismatch, duplicate/ambiguous local head
branch, or dependency cycle returns:

```text
decision=HOLD_PR_PATH_COLLISION_AUDIT
```

Only an exact, unambiguous audit with no unrelated overlap returns:

```text
decision=SAFE_NO_UNRELATED_OPEN_PR_PATH_COLLISIONS
```

## Read completeness

V1 obtains open PR metadata and each PR's file list through `gh api` using
`--paginate --slurp`.

The audit requires a file-list entry for every observed open PR. Missing file
data is an error rather than an empty set. That prevents partial GitHub reads
from being converted into a false no-collision result.

The JSON result is create-only and mode `0600`.

## GitHub Actions

The workflow has only:

- `contents: read`
- `pull-requests: read`

Pull-request execution proves the pure logic on Node.js 22, 24, and 26 and then
self-audits the exact PR head against the current open-PR set.

Manual dispatch supports either:

1. an exact open PR number, optionally bound to its exact head SHA; or
2. a JSON array of proposed candidate paths.

## Authority boundary

This lane is source, proof, documentation, workflow, and read-only GitHub
metadata only.

The audit performs no Git fetch/pull/checkout/reset itself; no branch
creation/update/deletion; no commit or push; no pull-request mutation; no
workflow rerun; no runtime mutation; no credential read beyond the GitHub token
already supplied to `gh` by the workflow; no wallet/signer action; no
transaction; and no fund movement.

A green result is point-in-time collision evidence. It does not authorize a
later branch move, PR state change, merge, deployment, runtime action, or
economic mutation.

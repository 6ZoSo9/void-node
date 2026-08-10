# VOID PR Base Reconciliation Audit V1

## Purpose

VOID frequently has many open pull requests while `main` and stacked parent
branches continue moving. Before a worker reconciles an older PR with its
current base, the worker needs a deterministic answer to a narrower question:

> Did the feature side and the newer base side touch disjoint repository paths?

This lane answers that question read-only and fail-closed. It does **not** move
the branch, synthesize a merge commit, update PR metadata, or claim semantic
compatibility.

It complements:

- `VOID PR Stack Dependency Audit V1` (#1164), which guards moving a parent
  branch while open descendants depend on it; and
- `VOID PR Path Collision Audit V1` (#1174), which detects same-path ownership
  among unrelated open PRs.

## Exact model

For one open same-repository PR, V1 binds:

- exact PR number;
- exact current head branch/SHA;
- exact current base branch/SHA;
- optional caller-pinned expected head/base SHAs; and
- one unambiguous Git merge base.

A fresh full-history checkout must already contain the exact head and base
objects reported by GitHub. The audit tool does not fetch. If the API-reported
object is not locally available, collection fails closed.

The audit computes:

```text
merge_base = merge-base(base, head)
feature_delta = merge_base .. head
base_movement = merge_base .. base
```

`git rev-list --left-right --count base...head` supplies exact ahead/behind
counts.

## Touched paths

Each side is read with NUL-delimited:

```text
git diff --name-status -z --find-renames --find-copies
```

V1 therefore includes:

- ordinary add/modify/delete/type changes;
- mode-only modifications reported by Git;
- both old and new paths for renames; and
- both source and destination paths for copies.

Exact duplicate paths are collisions.

V1 also conservatively treats a file/directory namespace conflict as a
structural collision. For example:

```text
feature: public/manifest
base:    public/manifest/current.json
```

holds even though the strings are not identical.

## Decisions

### `CURRENT_WITH_BASE_NO_RECONCILIATION_NEEDED`

The current base is already an ancestor of the PR head (`behind_by=0`), the
feature delta is non-empty, and all bindings are internally consistent.

### `SAFE_PATH_DISJOINT_RECONCILIATION_CANDIDATE`

The PR is behind its current base, has a non-empty feature delta, and the
feature/base-movement touched-path sets have no exact or structural collision.

This is only a **candidate** result. It does not authorize branch movement and
does not prove that path-disjoint changes are semantically compatible.

### `HOLD_BASE_RECONCILIATION_AUDIT`

Any of the following holds:

- expected head SHA mismatch;
- expected base SHA mismatch;
- cross-repository/fork PR in V1;
- unavailable or ambiguous merge-base evidence;
- no feature commits;
- contradictory ahead/behind ancestry;
- empty feature/base path evidence where commits require it;
- exact path collision; or
- structural path collision.

Collection errors such as shallow history or missing exact commit objects exit
fail-closed rather than returning a safe decision.

## Why no automatic merge-tree claim

A Git merge can sometimes auto-resolve changes to the same file. V1 deliberately
does not use that as permission to reconcile. Same-path movement is a
coordination signal and remains a hold.

Conversely, path-disjointness does not prove behavioral compatibility. The
normal proof/typecheck/build/CI wall still belongs after any later authorized
reconciliation.

## GitHub Actions

The workflow has only:

- `contents: read`
- `pull-requests: read`

The proof runs on Node.js 22, 24, and 26.

For pull requests, a live self-audit uses a full-history checkout with
`persist-credentials: false` and binds the exact event head/base SHAs.

Manual dispatch can audit any open same-repository PR, optionally pinning exact
expected head/base SHAs.

The tool itself performs no network fetch and updates no Git ref. The workflow's
checkout is the only source materialization step.

## Output

JSON evidence is create-only and mode `0600`.

A successful candidate result includes:

- exact head/base/merge-base SHAs;
- ahead/behind counts;
- sorted feature touched paths;
- sorted base-movement touched paths;
- exact and structural collision arrays;
- decision/reasons; and
- explicit authority flags.

## Authority boundary

This lane is source, proof, documentation, workflow, local Git read analysis,
GitHub PR metadata reads, ordinary branch publication, and draft PR metadata
only.

The audit tool performs:

- no network fetch;
- no remote Git mutation;
- no working-tree mutation;
- no local Git ref update;
- no branch creation/update/deletion;
- no commit or push;
- no PR mutation;
- no workflow rerun;
- no runtime mutation;
- no credential/private-key/wallet/signer access;
- no transaction; and
- no fund movement.

A green audit is point-in-time evidence only. Reconciliation, ready-for-review,
merge, deployment, service actions, and all economic actions remain separate
authorization gates.

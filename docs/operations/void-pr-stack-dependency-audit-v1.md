# VOID PR Stack Dependency Audit V1

## Purpose

VOID development uses many stacked pull requests and concurrent workers. An open
child pull request names its parent's feature branch as `baseRefName`. Moving
that parent branch changes the child's effective base underneath the worker even
when the two semantic file sets are disjoint.

This lane adds a read-only, fail-closed pre-movement audit for that dependency
edge. It is intended to run before reconciling, fast-forwarding, or otherwise
moving an open PR branch.

## Files

- `tools/void-pr-stack-dependency-audit-v1.mjs` reads open GitHub PR metadata and
  reports direct and transitive child dependencies.
- `scripts/prove_void_pr_stack_dependency_audit_v1.mjs` proves the dependency
  graph and fail-closed behavior with synthetic fixtures.
- `.github/workflows/void-pr-stack-dependency-audit-v1.yml` runs the proof and
  exposes a read-only `workflow_dispatch` guard for parent-branch checks.

## Guard contract

The audit accepts:

- one exact GitHub repository;
- one exact candidate parent branch;
- optionally, the exact expected 40-hex parent head SHA; and
- an output path.

It reads only open PR metadata:

- PR number and title;
- URL and draft state;
- exact head branch and head SHA; and
- exact base branch.

A PR is a **direct child** when its exact `baseRefName` equals the proposed
parent branch. Descendants are then discovered transitively through exact branch
equality. Prefixes and substrings do not count as dependencies.

The decision is:

- `SAFE_NO_OPEN_CHILD_DEPENDENCIES` only when there is no child dependency and
  every requested parent-head check is exact; or
- `HOLD_PARENT_BRANCH_MOVEMENT` when any direct child exists, the dependency
  graph cycles, the parent PR is ambiguous, or the requested parent head cannot
  be verified exactly.

Exit status is `0` for safe, `2` for hold, and `1` when trustworthy GitHub
metadata cannot be established.

## Why this exists

A concrete example is a stack such as:

```text
#1159 head: fix/buy-void-terminal-closeout-plan-binding-v1-20260809
  └─ #1158 base: fix/buy-void-terminal-closeout-plan-binding-v1-20260809
```

Before moving #1159's head, this audit returns a hold naming #1158. This is
different from changed-path collision detection: a child PR can be harmed by a
parent branch move even when the files are completely disjoint.

## Command line

```bash
node tools/void-pr-stack-dependency-audit-v1.mjs \
  --repo 6ZoSo9/void-node \
  --parent-branch "feat/example-parent-v1" \
  --expected-parent-head "<exact-40-hex-head-sha>" \
  --output "/tmp/void-pr-stack-audit.json"
```

`--expected-parent-head` is optional. When supplied, the named parent branch
must be the head of exactly one open PR and GitHub must report that exact SHA.

The output file is create-only and mode `0600`.

## GitHub Actions

The workflow has no write permission. Use **Run workflow** and provide the
parent branch before any branch reconciliation or fast-forward. An expected head
SHA can be supplied to make the check both dependency-aware and head-exact.

The pull-request path also self-checks this automation branch to prove that the
live GitHub metadata path works.

## Authority boundary

This lane is source, proof, documentation, workflow, and read-only GitHub PR
metadata only.

It does not fetch, pull, checkout, reset, create/update/delete branches, commit,
push, change a pull request, rerun workflows, mutate a runtime, read credentials,
access a wallet or signer, submit a transaction, or move funds.

A green audit is point-in-time evidence. It does not itself authorize a later
branch movement; the caller still needs whatever repository authorization is
required for that write.

# VOID Active Lane Retirement V1

## Purpose

`void-active-lane-retirement-v1.mjs` is the guarded counterpart to the active
lane bootstrap. It retires one exact branch/worktree only after proving that the
lane is clean, merged into live `origin/main`, unused by processes, and not the
head of an open pull request.

The tool always creates and verifies a Git bundle before deleting a remote
branch, removing a worktree, or deleting a local branch.

## Plan

```bash
BRANCH="feat/example-v1"
WORKTREE="$HOME/dev/void-node-example-v1"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$HOME/void-lane-control/example-retirement-${STAMP}"
PLAN="$HOME/Downloads/example-retirement-plan.json"

node tools/void-active-lane-retirement-v1.mjs plan \
  --repo-root "$HOME/dev/void-node" \
  --branch "$BRANCH" \
  --worktree "$WORKTREE" \
  --archive-dir "$ARCHIVE" \
  --output "$PLAN" \
  --require-github
```

`plan` is read-only. It does not fetch, change refs, create an archive
directory, remove a worktree, delete a branch, or modify a pull request. A clear
plan prints the exact confirmation token bound to the observed branch head.

Plan requirements include:

- the canonical checkout is clean and on `main`;
- the candidate is one registered, non-detached, unlocked worktree;
- the candidate branch, registered head, and worktree head are identical;
- the candidate working tree is clean;
- the candidate head is an ancestor of live `origin/main`;
- no process references the candidate path;
- no open pull request uses the candidate branch;
- a live remote branch is absent or points to the exact candidate head;
- the archive directory does not already exist.

A reservation-policy match is reported as metadata. It is not sufficient by
itself to authorize retirement and does not replace the exact-head confirmation.

## Apply

Read the head and confirmation from the plan receipt, then run:

```bash
HEAD="$(jq -r '.inspection.candidate.local_branch_head' "$PLAN")"

node tools/void-active-lane-retirement-v1.mjs apply \
  --repo-root "$HOME/dev/void-node" \
  --branch "$BRANCH" \
  --worktree "$WORKTREE" \
  --archive-dir "$ARCHIVE" \
  --output "$HOME/Downloads/example-retirement-receipt.json" \
  --confirm "RETIRE_VOID_LANE:${BRANCH}:${HEAD}" \
  --require-github
```

`apply` performs a fresh live inspection and may fetch the exact live
`origin/main` commit into the object cache without updating a branch or
remote-tracking ref. It then:

1. creates a new archive directory outside both repositories;
2. creates and verifies `active-lane-source-v1.bundle`;
3. writes a preflight receipt;
4. rechecks the candidate immediately before deletion;
5. deletes the remote branch only when it still equals the pinned head;
6. removes the exact clean worktree;
7. deletes the exact local branch;
8. verifies the canonical `main` checkout is unchanged and clean;
9. writes final receipts and checksums.

If a later stage fails, the tool writes a failure receipt containing the stage
and completed mutations. The verified bundle remains the recovery source.

## Exit statuses

- `0`: plan is clear or apply completed and verified.
- `1`: no trustworthy result could be established.
- `2`: a known safety precondition or exact confirmation failed.

## Safety boundary

The tool may read repository, process, and GitHub metadata. `apply` may fetch an
exact commit object, create a local archive, delete one exact remote branch,
remove one exact clean worktree, and delete one exact local branch.

It does not check out, reset, commit, merge, or fast-forward canonical `main`.
It does not create a commit, tag, push a new branch, edit a pull request, restart
a service, signal a process, change a listener or Tor configuration, read hidden
service keys, deploy software, access a wallet, mutate Work Credits, move money,
or read token bytes.

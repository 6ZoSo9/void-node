# VOID Active Lane Retirement V2

## Purpose

`void-active-lane-retirement-v2.mjs` retires one exact clean branch/worktree only after establishing a trustworthy relationship to live `origin/main`.

V2 preserves every V1 guard and adds support for squash-merged pull requests. V1 remains in the repository unchanged as an auditable historical contract.

A candidate is eligible through exactly one of these lineages:

1. **Direct commit ancestry:** the candidate branch head is an ancestor of live `origin/main`.
2. **Verified squash-merged pull request:** GitHub reports exactly one merged pull request whose base is `main`, head branch equals the candidate branch, head OID equals the exact candidate head, and merge commit is an ancestor of live `origin/main`.

A branch name alone, a matching title, a closed pull request, or an unverified merge commit is never sufficient.

## Plan

```bash
BRANCH="feat/example-v2"
WORKTREE="$HOME/dev/void-node-example-v2"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$HOME/void-lane-control/example-retirement-${STAMP}"
PLAN="$HOME/Downloads/example-retirement-plan-v2.json"

node tools/void-active-lane-retirement-v2.mjs plan \
  --repo-root "$HOME/dev/void-node" \
  --branch "$BRANCH" \
  --worktree "$WORKTREE" \
  --archive-dir "$ARCHIVE" \
  --output "$PLAN" \
  --require-github
```

`plan` is read-only. It does not fetch objects, change refs, create the archive directory, remove a worktree, delete a branch, or change a pull request.

For squash lineage, `--require-github` is mandatory. The receipt records the exact pull request number, source head OID, merge commit OID, and merge-commit ancestry result. Zero matches, multiple matches, malformed metadata, an unavailable merge object, or a merge commit outside live `main` produces a refusal.

All V1 requirements still apply:

- canonical checkout clean and on `main`;
- exactly one registered, non-detached, unlocked worktree;
- local branch, registered head, and worktree head identical;
- candidate working tree clean;
- no process references the candidate path;
- no open pull request uses the candidate branch;
- live remote branch absent or at the exact candidate head;
- new archive directory;
- explicit confirmation bound to branch and exact source head.

## Apply

Use the confirmation token from the plan receipt:

```bash
HEAD="$(jq -r '.inspection.candidate.local_branch_head' "$PLAN")"

node tools/void-active-lane-retirement-v2.mjs apply \
  --repo-root "$HOME/dev/void-node" \
  --branch "$BRANCH" \
  --worktree "$WORKTREE" \
  --archive-dir "$ARCHIVE" \
  --output "$HOME/Downloads/example-retirement-receipt-v2.json" \
  --confirm "RETIRE_VOID_LANE:${BRANCH}:${HEAD}" \
  --require-github
```

`apply` repeats all checks, fetches only exact commit objects when required for verification, creates and verifies `active-lane-source-v2.bundle`, writes a preflight receipt, repeats the lineage check immediately before deletion, then deletes the exact remote branch if present, removes the exact worktree, and deletes the exact local branch.

The initial and immediate lineage records must be byte-for-byte identical. A PR, branch, head, merge commit, canonical-main head, or remote-branch change causes a refusal before destructive cleanup.

## Exit statuses

- `0`: plan is clear or apply completed and verified.
- `1`: no trustworthy result could be established.
- `2`: a known safety precondition, lineage requirement, or exact confirmation failed.

## Safety boundary

The tool may read local repository state, `/proc`, live origin refs, and GitHub pull-request metadata. `apply` may fetch an exact object, create a local archive, delete one exact remote branch, remove one exact clean worktree, and delete one exact local branch.

It does not check out, reset, commit, merge, fast-forward, or modify canonical `main`. It does not create a tag, push a new branch, edit a pull request, restart or signal a process, change listeners or Tor configuration, deploy software, access wallets or secrets, mutate Work Credits, move funds, or read token bytes.

# VOID Active Lane Bootstrap V1

## Purpose

The active-lane registry detects branch and worktree collisions, but a manual
gap remains between a green check and `git worktree add`. This tool narrows that
gap and standardizes lane creation across parallel chats.

It reads live `origin/main`, invokes the canonical registry check, rechecks the
candidate immediately before creation, and creates exactly one local branch and
worktree from fetched `origin/main`.

## Plan

```bash
node tools/void-active-lane-bootstrap-v1.mjs plan \
  --repo-root "$HOME/dev/void-node" \
  --branch "feat/example-v1" \
  --worktree "$HOME/dev/void-node-example-v1" \
  --output "$HOME/Downloads/void-example-bootstrap-plan.json" \
  --require-github
```

`plan` is read-only. It queries live origin refs and open pull-request metadata
without changing repository refs. Exit status `0` means the candidate is clear
at capture time. Exit status `2` means a known collision exists.

## Apply

```bash
node tools/void-active-lane-bootstrap-v1.mjs apply \
  --repo-root "$HOME/dev/void-node" \
  --branch "feat/example-v1" \
  --worktree "$HOME/dev/void-node-example-v1" \
  --output "$HOME/Downloads/void-example-bootstrap-receipt.json" \
  --confirm "CREATE_VOID_LANE:feat/example-v1" \
  --require-github
```

`apply` requires a clean canonical `main`, fetches current `origin/main`, runs a
fresh canonical registry check, rechecks live origin and open PR state, and then
creates one branch/worktree. The new branch starts at fetched `origin/main`.
Canonical `main` is not checked out, reset, committed, or fast-forwarded.

If a post-creation guard fails, the newly created worktree and branch are
removed automatically.

## Exit statuses

- `0`: plan is clear or apply completed.
- `1`: no trustworthy result could be established.
- `2`: the candidate has a known collision.

## Safety boundary

The tool may query live GitHub metadata. `apply` may fetch `origin/main` and
create one local branch and worktree. It performs no commit, push, pull-request
change, deployment, runtime mutation, service restart, wallet access, Work
Credit mutation, payment, or token-byte read.

# VOID Active Lane Coordination Registry V1

## Purpose

VOID development commonly proceeds through multiple chats and worktrees at the
same time. Git branches alone are not enough to prevent collisions because a
lane may be reserved before its branch exists, represented by a detached
runtime/evidence worktree, or active through an open pull request.

This lane adds one read-only command that captures the current collision map and
checks a proposed branch/worktree pair before development starts.

## Files

- `ops/coordination/active-lane-reservations-v1.json` contains exact and family
  reservations.
- `tools/void-active-lane-registry-v1.mjs` captures current worktrees, local and
  origin refs, open pull requests, dirty state, process references, and policy
  reservations.
- `scripts/prove_void_active_lane_coordination_registry_v1.mjs` verifies the
  parser, candidate guard, canonical output, and token-aware Tor matcher.
- `.github/workflows/void-active-lane-coordination-registry-v1.yml` runs the
  proof and a live read-only capture for changes to this lane.

## Collision check

Run before creating a branch or worktree:

```bash
node tools/void-active-lane-registry-v1.mjs check \
  --repo-root "$HOME/dev/void-node" \
  --policy "$HOME/dev/void-node/ops/coordination/active-lane-reservations-v1.json" \
  --candidate-branch "feat/example-v1" \
  --candidate-worktree "$HOME/dev/void-node-example-v1" \
  --output "$HOME/Downloads/void-example-lane-check.json" \
  --require-github
```

Exit status `0` means the candidate is collision-free at capture time. Exit
status `2` means it collides. Exit status `1` means the check could not establish
a trustworthy result.

The check is a point-in-time guard, not a distributed lock. Create the branch
and worktree immediately after a green result so the reservation becomes
visible to other chats through Git.

## Capture

```bash
node tools/void-active-lane-registry-v1.mjs capture \
  --repo-root "$HOME/dev/void-node" \
  --policy "$HOME/dev/void-node/ops/coordination/active-lane-reservations-v1.json" \
  --output "$HOME/Downloads/void-active-lanes.json" \
  --require-github
```

## Safety boundary

The tool performs no fetch, checkout, reset, commit, push, branch creation,
branch deletion, worktree creation, worktree removal, pull-request change,
runtime mutation, or token-byte read. It invokes `gh pr list` only for public PR
metadata.

## Tor matcher correction

Tor is matched as a token bounded by `/`, `.`, `_`, `-`, or string boundaries.
The words `operator`, `orchestrator`, and `executor` do not match the Tor family.
The proof locks this behavior.

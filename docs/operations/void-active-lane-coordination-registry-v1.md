# VOID Active Lane Coordination Registry V1

## Purpose

VOID development commonly proceeds through multiple chats and worktrees at the
same time. Git branches alone are not enough to prevent collisions because a
lane may be reserved before its branch exists, represented by a detached
runtime/evidence worktree, or active through an open pull request.

This lane adds one read-only command that captures the current collision map and
checks a proposed branch/worktree pair before development starts. An optional
planned-path claim also rejects overlap with uncommitted files, unique local
commits, and open pull-request files, even when branch names are unrelated.

## Files

- `ops/coordination/active-lane-reservations-v1.json` contains exact and family
  reservations.
- `tools/void-active-lane-registry-v1.mjs` captures current worktrees, local and
  origin refs, open pull requests, dirty state, changed-path metadata, process
  references, and policy reservations.
- `scripts/prove_void_active_lane_coordination_registry_v1.mjs` verifies the
  parser, candidate guard, canonical output, and token-aware Tor matcher.
- `.github/workflows/void-active-lane-coordination-registry-v1.yml` runs the
  proof and a live read-only capture for changes to this lane.

## Collision check

Run before creating a branch or worktree:

```bash
printf '%s\n' \
  'src/example/new-route.ts' \
  'docs/example/' \
  >"$HOME/Downloads/void-example-planned-paths.txt"

node tools/void-active-lane-registry-v1.mjs check \
  --repo-root "$HOME/dev/void-node" \
  --policy "$HOME/dev/void-node/ops/coordination/active-lane-reservations-v1.json" \
  --candidate-branch "feat/example-v1" \
  --candidate-worktree "$HOME/dev/void-node-example-v1" \
  --candidate-paths-file "$HOME/Downloads/void-example-planned-paths.txt" \
  --output "$HOME/Downloads/void-example-lane-check.json" \
  --require-github
```

The planned-path file is newline-delimited. Blank lines and lines beginning with
`#` are ignored. Claims must be repository-relative. A trailing `/` claims a
whole directory; otherwise the claim is an exact file path. Absolute paths,
backslashes, and `.` or `..` path segments are rejected.

Exit status `0` means the candidate is collision-free at capture time. Exit
status `2` means it collides. Exit status `1` means the check could not establish
a trustworthy result.

When planned paths are supplied, `planned_path_overlap` identifies a concrete
overlap and `planned_path_metadata_incomplete` prevents a false green result if
the tool cannot completely enumerate local worktree or open-PR changed paths.
The output includes the candidate path, active path, branch, worktree, and PR
number for every collision.

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
metadata and `gh pr view` for changed file paths. It never reads changed file
contents.

## Tor matcher correction

Tor is matched as a token bounded by `/`, `.`, `_`, `-`, or string boundaries.
The words `operator`, `orchestrator`, and `executor` do not match the Tor family.
The proof locks this behavior.

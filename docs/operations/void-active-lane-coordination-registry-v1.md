# VOID Active Lane Coordination Registry V1

## Purpose

VOID development commonly proceeds through multiple chats and worktrees at the
same time. Git branches alone are not enough to prevent collisions because a
lane may be reserved before its branch exists, represented by a detached
runtime/evidence worktree, or active through an open pull request.

This lane provides one read-only command that captures the current collision map
and checks a proposed branch/worktree pair before development starts. An optional
planned-path claim detects overlap with uncommitted files, unique local commits,
and open pull-request files, even when branch names are unrelated.

Collision discovery and collision severity are deliberately separate. The raw
V1 evidence remains visible, while the V2 decision embedded in the same `check`
command decides whether the candidate is a hard stop, an advisory reconciliation
risk, or clear to proceed.

## Files

- `ops/coordination/active-lane-reservations-v1.json` contains exact/family
  reservations plus the V2 coordination-severity policy.
- `tools/void-active-lane-registry-v1.mjs` captures current worktrees, local and
  origin refs, open pull requests, dirty state, changed-path metadata, process
  references, and policy reservations, then risk-weights a candidate result.
- `scripts/prove_void_active_lane_coordination_registry_v1.mjs` verifies the
  parser, raw collision evidence, Red/Amber/Green decision behavior, canonical
  output, changed-path enumeration, and token-aware Tor matcher.
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

The candidate result preserves the original evidence fields:

- `collision_free` means the raw V1 scan found no reservation/path/branch reason;
- `reasons` lists every detected collision reason;
- `path_collisions` lists exact planned-path overlaps; and
- `path_metadata_complete` reports whether the scan could enumerate all relevant
  local/open-PR path evidence.

A raw collision is no longer automatically a blocking result. The same candidate
also reports `decision`, `hard_stop`, `hard_reasons`, `advisory_reasons`, and
separate hard/advisory path-collision sets.

## Risk-weighted decisions

### `HARD_STOP` — Red

Exit status is `2`. Competing work must stop unless the collision is removed or
explicitly overridden through the normal authority boundary.

Red includes exact branch/worktree reuse and collisions involving sensitive or
shared mutable state such as Chain/consensus source, contracts, `src/node_core.ts`,
production operations, Buy VOID/economic mutation, wallets/signers, treasury,
Work Credit, validators, deployment/restart authority, or another explicitly
sensitive path/semantic lane. Incomplete collision metadata is also Red when the
candidate itself is sensitive.

The point is to fail closed where concurrent work could corrupt state, duplicate
an economic action, create ambiguous authority, or make reconciliation unsafe.

### `PROCEED_WITH_ADVISORY` — Amber

Exit status is `0`. The worker may continue with bounded source work, while the
reported advisory reasons remain part of the reconciliation evidence.

Amber includes ordinary static family reservations, non-sensitive source-path
overlap, and incomplete path metadata for otherwise non-sensitive work. Amber is
not permission to duplicate an existing canonical implementation or inherit a
sensitive authority boundary. Keep the scope narrow and reconcile any surviving
overlap before merge.

A prior-30-minute activity signal is therefore advisory for ordinary source work
rather than a subsystem-wide cooldown. It remains exclusionary when the work is
Red/sensitive.

### `CLEAR` — Green

Exit status is `0`. No material collision was identified. Proceed normally under
`AGENTS.md`, the active repository plan, and the ordinary proof/review gates.

Exit status `1` remains reserved for cases where the tool could not establish a
trustworthy result at all.

## Priority fall-through and exploration

The registry does not assign work. `AGENTS.md` defines the scheduling behavior:
workers prefer the highest-value useful priority, fall through when that work is
already occupied or Red-blocked, and may enter bounded exploration when the named
priority lanes are taken.

Exploration still excludes Red work. Workers should rank remaining Green/Amber
gaps by value and risk and choose a bounded improvement rather than idle or open
a duplicate canonical implementation.

## Point-in-time boundary

The check remains a point-in-time guard, not a distributed lock. Create the
branch/worktree promptly after a Green or Amber result so ordinary Git activity
becomes visible to other workers. A later Red collision always takes precedence
over an earlier advisory result.

## Capture

```bash
node tools/void-active-lane-registry-v1.mjs capture \
  --repo-root "$HOME/dev/void-node" \
  --policy "$HOME/dev/void-node/ops/coordination/active-lane-reservations-v1.json" \
  --output "$HOME/Downloads/void-active-lanes.json" \
  --require-github
```

Capture remains evidence-only and does not reserve, release, or mutate a lane.

## Safety boundary

The tool performs no fetch, checkout, reset, commit, push, branch creation,
branch deletion, worktree creation, worktree removal, pull-request change,
runtime mutation, or token-byte read. It invokes `gh pr list` only for public PR
metadata and `gh pr view` for changed file paths. It never reads changed file
contents.

Risk-weighting changes whether a detected collision blocks source work; it grants
no deployment, service, credential, wallet, signer, payment, Work Credit,
validator, treasury, transaction, or fund-movement authority.

## Tor matcher correction

Tor is matched as a token bounded by `/`, `.`, `_`, `-`, or string boundaries.
The words `operator`, `orchestrator`, and `executor` do not match the Tor family.
The proof locks this behavior.

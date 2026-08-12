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

A Red result is **candidate-local**. It forbids the checked candidate; it does not
forbid the worker from selecting a different disjoint candidate and running a
fresh check. This keeps sensitive work fail-closed without turning one occupied
lane into a worker-wide idle state.

## Files

- `ops/coordination/active-lane-reservations-v1.json` contains exact/family
  reservations plus the V2 coordination-severity policy.
- `tools/void-active-lane-registry-v1.mjs` captures current worktrees, local and
  origin refs, open pull requests, dirty state, changed-path metadata, process
  references, and policy reservations, then risk-weights a candidate result.
- `scripts/prove_void_active_lane_coordination_registry_v1.mjs` verifies the
  parser, raw collision evidence, Red/Amber/Green decision behavior,
  candidate-local Red fallthrough, canonical output, changed-path enumeration,
  reservation cleanup evidence, and token-aware Tor matcher.
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
also reports `decision`, `hard_stop`, `proceed_allowed`,
`priority_fallthrough_allowed`, `exploration_allowed`, `hard_reasons`,
`advisory_reasons`, and separate hard/advisory path-collision sets.

## Risk-weighted decisions

### `HARD_STOP` — Red

Exit status is `2`. The **checked candidate** must not proceed unless the
collision is removed or explicitly overridden through the normal authority
boundary.

Red includes exact branch/worktree reuse and collisions involving sensitive or
shared mutable state such as Chain/consensus source, contracts, `src/node_core.ts`,
production operations, Buy VOID/economic mutation, wallets/signers, treasury,
Work Credit, validators, deployment/restart authority, or another explicitly
sensitive path/semantic lane. Incomplete collision metadata is also Red when the
candidate itself is sensitive.

A trustworthy Red result now reports:

```text
decision=HARD_STOP
hard_stop=true
proceed_allowed=false
priority_fallthrough_allowed=true
exploration_allowed=true
```

Fallthrough does **not** authorize a neighboring-file or renamed-branch
workaround. The worker must leave the Red semantic/path boundary, choose a new
disjoint candidate, and run a fresh registry/path check before mutation.

The point is to fail closed where concurrent work could corrupt state, duplicate
an economic action, create ambiguous authority, or make reconciliation unsafe,
without freezing unrelated useful work.

### Untrustworthy scan — HOLD

A registry execution that cannot establish trustworthy evidence is different
from a known Red result. Malformed policy, unavailable required GitHub metadata,
invalid path claims, or unreadable required repository evidence causes the tool
to fail with exit status `1` and no inferred clearance.

Do not treat such a failure as permission to mutate either the original
candidate or a fallthrough candidate. Restore trustworthy evidence and rerun the
check.

### `PROCEED_WITH_ADVISORY` — Amber

Exit status is `0`. The worker may continue with bounded source work, while the
reported advisory reasons remain part of the reconciliation evidence.

Amber includes ordinary static family reservations, non-sensitive source-path
overlap, and incomplete path metadata for otherwise non-sensitive work. Amber is
not permission to duplicate an existing canonical implementation or inherit a
sensitive authority boundary. Keep the scope narrow and reconcile any surviving
overlap before merge.

A prior-30-minute activity signal is advisory for ordinary source work rather
than a subsystem-wide cooldown. It remains exclusionary for the exact active
Red/sensitive boundary.

### `CLEAR` — Green

Exit status is `0`. No material collision was identified. Proceed normally under
`AGENTS.md`, the active repository plan, and the ordinary proof/review gates.

## Exact reservation freshness

Exact reservations are intended for deliberate pre-PR or operator lanes. They
are not permanent subsystem ownership.

The August 12, 2026 repository audit found ten static exact reservations with no
current open-PR owner. Seven had no matching remote branch. The remaining three
were historical branches for already-merged PRs #840, #841, and #844. Those ten
entries were removed from the active exact-reservation set and retained only as
`retired_exact_reservations` audit history.

Future exact reservations should be kept only while current evidence justifies
them. Open PRs, registered worktrees, changed paths, process references, branch
refs, and current execution-plan ownership are stronger activity evidence than
an old static label. A reservation that no longer has a real lane should be
retired rather than allowed to create ghost ownership.

Retiring static reservation metadata does not delete a branch or worktree, stop
a process, close a PR, or weaken a live sensitive collision. Current live
evidence can still produce Red independently of the static list.

Family reservations remain broader advisory/semantic evidence. They do not
replace exact path checks or the active repository plan.

## Priority fall-through and exploration

The registry does not assign work. `AGENTS.md` defines the scheduling behavior:
workers prefer the highest-value useful priority, fall through when that work is
already occupied or Red-blocked, and may enter bounded exploration when the named
priority lanes are taken.

Exploration still excludes the blocked Red candidate. Workers should rank new
disjoint Green/Amber gaps by value and risk and choose a bounded improvement
rather than idle or open a duplicate canonical implementation.

Every fallthrough candidate receives its own fresh check. A prior Red result does
not transfer authority to the next lane.

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

Risk-weighting changes whether a detected collision blocks the checked source
candidate; it grants no deployment, service, credential, wallet, signer,
payment, Work Credit, validator, treasury, transaction, or fund-movement
authority.

## Tor matcher correction

Tor is matched as a token bounded by `/`, `.`, `_`, `-`, or string boundaries.
The words `operator`, `orchestrator`, and `executor` do not match the Tor family.
The proof locks this behavior.

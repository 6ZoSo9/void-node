# VOID Coordination Rotation Live Snapshot V1

Marker: `VOID_COORDINATION_ROTATION_LIVE_SNAPSHOT_V1`

## Purpose

The canonical rotation-preparation snapshot is intentionally strict, but it accepts a prepared evidence packet. This live wrapper removes the remaining manual JSON-assembly step while preserving the same authority boundary.

One command captures:

- the current `main` SHA before and after the census;
- the live coordination successor chain before and after the census;
- the complete bounded set of open pull requests;
- exact per-PR head/base/draft/update identity before and after changed-file collection; and
- every changed path for each open pull request.

Only after all before/after identities agree does the wrapper call the canonical `VOID_COORDINATION_ROTATION_SNAPSHOT_V1` builder. The live-dispatch policy is fetched from the exact captured remote `main` commit through GitHub's contents API, and its returned Git blob SHA is independently recomputed from the UTF-8 bytes before the policy is admitted.

The result is still point-in-time evidence. Ada remains the single rollover writer.

## Live race boundary

The capture fails closed when any of the following changes while the command is running:

- current `main`;
- the resolved successor chain;
- the open-PR set or any open-PR summary identity;
- an individual PR's state, draft bit, head SHA, base SHA, update timestamp, or changed-file count.

The changed-file list must be complete and its cardinality must equal GitHub's `changed_files` metadata. Duplicate PR numbers, duplicate paths, unsafe repository-relative paths, oversized PR sets, or oversized changed-path sets are rejected.

The wrapper re-runs the successor-chain resolver after the PR census rather than trusting a pre-census chain receipt. This is important because #1507 remains an actively changing coordination surface.

## Bounds

- at most 250 open pull requests;
- at most 500 changed paths per pull request;
- open-PR list pagination is bounded to three 100-row pages;
- changed-file pagination is bounded to five 100-row pages;
- each GitHub API call has a 30-second timeout.

These match or tighten the canonical snapshot admission limits.

## Live command

From a checkout with authenticated read access through `gh`:

```bash
node tools/void-coordination-rotation-live-snapshot-v1.mjs --pretty
```

Explicit repository/root/policy:

```bash
node tools/void-coordination-rotation-live-snapshot-v1.mjs \
  --repository 6ZoSo9/void-node \
  --root-issue 1507 \
  --policy ops/coordination/worker-live-dispatch-policy-v1.json \
  --pretty
```

`--policy` is a normalized **repository-relative path**, not a local trust override. The wrapper fetches that path at the exact captured remote-main SHA and verifies the Git blob identity before JSON parsing.

Optional create-only output:

```bash
node tools/void-coordination-rotation-live-snapshot-v1.mjs \
  --output "$HOME/Downloads/void-coordination-rotation-live-snapshot-v1.json" \
  --pretty
```

Output files are create-only and mode `0600`.

The wrapper uses only `gh api` GET requests. It reads the canonical policy bytes from the exact captured remote-main commit rather than trusting the local checkout. It does not fetch Git refs, checkout, reset, commit, push, create or close issues, post comments, or mutate scheduler/runtime state.

## Output

The top-level live-capture receipt includes:

- exact repository/root issue;
- capture-completion timestamp;
- exact stable main SHA;
- canonical policy repository path and verified Git blob SHA;
- exact open-PR count;
- successor-chain outcome;
- canonical snapshot outcome and snapshot ID;
- `live_capture_consistent=true`; and
- a content-addressed `live_capture_id`.

The complete canonical rotation-preparation snapshot is embedded as `snapshot`.

All negative authority fields remain false:

```text
issue_creation_authorized=false
issue_close_authorized=false
comment_post_authorized=false
scheduler_mutation_authorized=false
source_mutation_authorized=false
runtime_mutation_authorized=false
automatic_merge_authorized=false
authority_granted=false
mutation_performed=false
```

If the canonical snapshot returns a `HOLD_...` outcome, the CLI emits the receipt and exits `3`. Malformed/racy capture fails with exit `2`.

## Deterministic proof

```bash
node scripts/prove_void_coordination_rotation_live_snapshot_v1.mjs
```

The proof uses the real merged successor-chain resolver and real checked-in live-dispatch policy. It covers:

- overdue rotation preparation;
- resolved-successor policy-rebind detection;
- deterministic changed-path normalization;
- main drift;
- successor-chain drift;
- open-PR census drift;
- per-PR metadata drift;
- truncated changed-file evidence;
- missing/duplicate PR captures;
- unsafe paths;
- repository/root mismatch;\n- exact remote-main policy Git-blob binding and tamper rejection; and
- deterministic live-capture identity.

## Relationship to #2258

This wrapper prepares trustworthy point-in-time evidence for Ada; it does not perform #2258's post-rotation policy rebinding and does not create the successor. After a real successor exists, the canonical snapshot reports `SUCCESSOR_ALREADY_RESOLVED` and whether the checked-in dispatch policy needs rebinding.

## Authority boundary

No successor-body generation authority, issue creation/comment/close/lock, scheduler invocation or cadence mutation, source mutation authorization, Ready/merge authority, deployment, runtime/network action, credential/key/wallet/signer access beyond ordinary read-only GitHub API authentication, transaction construction/signing/submission, validator or Work Credit mutation, treasury/liquidity action, or funds movement is authorized by this tool.

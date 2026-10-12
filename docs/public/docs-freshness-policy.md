# Public documentation freshness policy

<!-- VOID_PUBLIC_DOCS_FRESHNESS_POLICY_V1 -->

VOID keeps two different kinds of documentation:

1. **Canonical current-state documentation**
2. **Immutable historical evidence**

They must not be treated as the same thing.

## Canonical current-state files

These files should describe what a new user, participant, operator, or reviewer can do now:

- `README.md`
- `docs/public/README.md`
- `docs/public/start-here.md`
- `docs/public/mainnet0-current-public-status.md`
- `docs/public/current-capability-matrix.md`
- `docs/public/run-a-node.md`
- `docs/public/participant-onboarding.md`

When capability state changes, update these files directly.

Do not keep appending new status sections to the root README.

## Historical evidence

The following are normally historical and should remain immutable unless a factual correction or explicit supersession notice is required:

- Receipts.
- Checkpoint documents.
- Proof outputs.
- Audit reports.
- Launch announcements.
- Release closeouts.
- Dated canary records.
- Signed evidence bundles.
- Hash manifests.
- Post-merge seals.

A historical file can accurately describe an old state without being the current guide.

## Status language

Use one of these labels for capability claims:

- **Live**
- **Bounded pilot**
- **Guarded**
- **Not enabled**
- **Planned**

Avoid vague claims such as “ready,” “available,” or “automatic” without stating the boundary.

## Current-state review checklist

Before merging a docs refresh:

1. Confirm the branch is based on current `origin/main`.
2. Identify all changed canonical files.
3. Preserve historical evidence.
4. Remove obsolete checkpoint hashes from the root README.
5. Separate public read-only evidence from public mutation authority.
6. State Work Credit earning, settlement, Buy VOID, wallet, and validator boundaries explicitly.
7. Verify every relative Markdown link.
8. Run the focused public-docs proof.
9. Run `git diff --check`.
10. Use normal CI and a post-merge checkpoint when the refresh materially changes public claims.

## Endpoint policy

A hosted endpoint may be listed in the current-status document, but protocol docs should prefer relative routes and discovery documents.

The root README should not depend on a single machine remaining the permanent canonical host.

## Commit and tag policy

Do not place a “current commit” or “current checkpoint tag” near the top of the root README. That claim becomes stale on the next merge.

Exact commits and tags belong in:

- Release notes.
- Receipts.
- Checkpoint records.
- Proof manifests.
- Signed evidence.

## Supersession

When a historical document contains a materially unsafe or incorrect claim:

- Do not silently rewrite evidence.
- Add a clear supersession notice.
- Link to the corrected record.
- Preserve both hashes when appropriate.

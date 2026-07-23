# First official release launch gate v1 — operator runbook

## Preconditions

- Clean `main`, with `HEAD == origin/main`.
- GitHub SSH origin and noninteractive SSH authentication.
- GitHub CLI authentication.
- Immutable releases enabled.
- Protected `void-release-publication` environment in either independent-review mode or solo time-lock mode. Solo mode requires a `main`-only policy, zero reviewers, no self-review claim, and a wait timer of at least 720 minutes.
- No existing tag or GitHub Release for the package version.
- Node.js 22 and installed development dependencies.

## 1. Prepare the exact gate

```bash
bash ops/release/void-first-official-release-launch-gate-v1.sh prepare-live \
  --preparer-id PREPARER_ID \
  --review-mode independent_review_v1
```

Preparation runs all release proofs, builds the exact release twice, performs the complete no-publish rehearsal, captures a live read-only GitHub preflight, and prints the approval phrase.

## Solo operator mode

When no second human exists, first configure the honest time lock:

```bash
bash ops/release/configure-void-release-publication-solo-v1.sh configure \
  --confirm 'CONFIGURE VOID SOLO RELEASE TIME LOCK 720 MINUTES'
```

Then prepare with a 24-hour packet lifetime:

```bash
bash ops/release/void-first-official-release-launch-gate-v1.sh prepare-live \
  --preparer-id SOLO_OPERATOR_ID \
  --review-mode solo_time_lock_v1 \
  --expires-hours 24
```

The same operator must use the printed `ACKNOWLEDGE SOLO ... WITHOUT INDEPENDENT REVIEW` phrase and then the separate `SEAL SOLO ...` phrase. GitHub still delays the publication job for at least 12 hours, allowing cancellation before mutation. Solo mode is explicitly weaker and never records an independent-review claim.

## 2. Approve and seal

In independent mode, a reviewer different from the preparer records the exact printed approval phrase and seals the authorization. In solo mode, the same operator records the explicit no-independent-review acknowledgement and separate solo seal phrase. The authorization is single use and expires within 24 hours.

## 3. Reverify and render

```bash
bash ops/release/void-first-official-release-launch-gate-v1.sh verify-live --state-dir STATE_DIR
bash ops/release/void-first-official-release-launch-gate-v1.sh render-live --state-dir STATE_DIR
```

The rendered draft command contains a placeholder launch-record commit and is not ready to use.

## 4. Stage the sealed launch record in a separate PR

```bash
bash ops/release/void-first-official-release-launch-record-v1.sh install   --state-dir STATE_DIR
```

This creates a local branch, copies the verified record under `release/launch-gate/records/LAUNCH_ID/`, stages it, and stops. Review, commit, push, and merge that record through the normal exact-head PR path. The helper performs none of those operations automatically.

If `main` changes before the record is staged, the helper refuses the old packet. Prepare a new gate instead of rebasing release authority.

## 5. Finalize the inert command after the record PR merges

Synchronize clean `main`, then run:

```bash
bash ops/release/void-first-official-release-launch-record-v1.sh finalize   --state-dir STATE_DIR   --launch-record-commit EXACT_CURRENT_MAIN_COMMIT
```

The helper verifies that the record commit is current `origin/main`, that the source commit is its ancestor, that the committed record matches the local sealed state, and that both deterministic builds still match. It writes `publication-command-final-v1.json`; it does not execute it.

## 6. Separate publication decision

Manual execution remains a distinct protected operator action. The publication workflow requires the launch ID, exact record commit, and packet/approval/authorization SHA-256 values. Before any publication mutation, it archives the record from that commit, rebuilds twice, and runs `verify-record` again.

## Abort

The preparer, independent reviewer, or solo operator can issue the exact abort phrase. A valid abort receipt causes all later gate, record, command-finalization, and workflow verification to fail closed.

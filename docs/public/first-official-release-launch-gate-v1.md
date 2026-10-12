# First official release launch gate v1

The launch gate is the final non-publishing control plane before the first official VOID release. It freezes one exact clean `main` source commit and package version, builds the release twice, verifies identical SHA-256 inventories, binds the complete no-publish rehearsal chain, captures the live immutable-release and protected-environment state, and requires an expiring single-use authorization under one of two explicit review modes: preferred independent review, or an honestly labeled solo time-lock when no second human exists.

The sealed gate is not directly executable. `render-live` creates a launch record containing the preflight, packet, approval, authorization, rehearsal packet, all eight rehearsal receipts, and a hash inventory. That record must be committed through a separate pull request under:

```text
release/launch-gate/records/LAUNCH_ID/
```

Only after the exact launch-record commit is current `main` can an operator finalize the inert publication command. The publication workflow independently archives that record from the supplied `main` commit, rebuilds the source release twice, checks the packet/approval/authorization hashes, reruns `verify-record`, and refuses to reach publication authority if anything changed or expired.

```bash
make public-first-official-release-launch-gate-v1-proof
```

## Review modes

`independent_review_v1` requires a reviewer different from the preparer and GitHub self-review prevention.

`solo_time_lock_v1` does **not** claim independent review. It requires zero configured reviewers, a GitHub environment wait timer of at least 720 minutes, a `main`-only deployment policy, explicit `NO_INDEPENDENT_REVIEW` acknowledgement, and distinct approval and seal phrases by the same operator. This is weaker than two-person review but stronger and more honest than inventing a reviewer identity.

After publication, the existing immutable-release canary and complete qualification matrix remain mandatory before stable promotion.

No release tag, GitHub Release, stable-channel change, live deployment, service restart, wallet mutation, Work Credit ledger write, Buy VOID fulfillment, validator admission, treasury movement, authority transfer, money movement, or guarded-lane activation occurs in this wall or launch-record helper.

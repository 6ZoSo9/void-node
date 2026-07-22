# First official release launch gate v1

The launch gate is the final non-publishing control plane before the first official VOID release. It freezes one exact clean `main` source commit and package version, builds the release twice, verifies identical SHA-256 inventories, binds the complete no-publish rehearsal chain, captures the live immutable-release and protected-environment state, and requires independent approval plus an expiring single-use authorization.

The sealed gate is not directly executable. `render-live` creates a launch record containing the preflight, packet, approval, authorization, rehearsal packet, all eight rehearsal receipts, and a hash inventory. That record must be committed through a separate pull request under:

```text
release/launch-gate/records/LAUNCH_ID/
```

Only after the exact launch-record commit is current `main` can an operator finalize the inert publication command. The publication workflow independently archives that record from the supplied `main` commit, rebuilds the source release twice, checks the packet/approval/authorization hashes, reruns `verify-record`, and refuses to reach publication authority if anything changed or expired.

```bash
make public-first-official-release-launch-gate-v1-proof
```

After publication, the existing immutable-release canary and complete qualification matrix remain mandatory before stable promotion.

No release tag, GitHub Release, stable-channel change, live deployment, service restart, wallet mutation, Work Credit ledger write, Buy VOID fulfillment, validator admission, treasury movement, authority transfer, money movement, or guarded-lane activation occurs in this wall or launch-record helper.

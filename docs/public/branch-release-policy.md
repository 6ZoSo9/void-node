# VOID Public Branch and Release Policy

status: active_public_operator_guidance
updated_at_utc: 20260821-173700Z

## Purpose

VOID Mainnet-0 is public-live. Public users and future public nodes may pull from the repository.

That means `main` is not a scratchpad. It is the public stable source lane and should contain only reviewed, proven changes.

## Source-of-truth and operator roles

Use this model:

- GitHub `main` is the public source-of-truth code and documentation lane.
- Feature/fix/docs branches are development and proof lanes.
- Pull requests are the normal review and integration boundary.
- Tags and GitHub Releases are public checkpoint anchors only when produced through the explicit release lane.
- Precision is the primary integration, commit, build, and proof box and currently hosts canonical Mainnet-0 production.
- Nimo is the preferred bounded canary/follower/executor box for proving changes before broader rollout.
- Alienware is the remote public/follower edge box. Because physical access is limited, changes that could threaten remote network access require extra caution.

A healthy project-operated three-node mesh demonstrates networking and role separation. It does not replace external operators or independent decentralization evidence.

## Normal source workflow

For normal work:

1. Refresh the exact live `main` commit before starting.
2. Create or reuse one bounded branch for the lane.
3. Keep the diff limited to the declared source/docs/proof scope.
4. Run the targeted local proof wall for the affected lane.
5. Run applicable typecheck/build/diff-hygiene checks.
6. Ordinary non-force push only after the remote branch race-check still matches the expected head.
7. Open or update a pull request.
8. Keep the PR draft while required hosted checks or exact-head review are incomplete.
9. Merge to `main` only after the exact PR head is reviewed and required proof/CI gates are terminal green.
10. Deploy, restart, synchronize runtime state, publish a release, or move authority only under a separately authorized lifecycle action.

Do not combine unrelated source, deployment, chain-state, wallet, validator, Work Credit, treasury, or release mutations into a convenience change.

## Branch requirements

Use a branch and pull request for:

- runtime code
- protocol logic
- segmented storage and WAL behavior
- P2P/follower synchronization
- validator lifecycle
- wallet behavior
- Buy VOID
- Work Credits
- DataNet
- relayers
- public API behavior
- security policy
- proof scripts
- release infrastructure
- public capability/status documentation
- anything that can materially affect public users, public nodes, or public claims

Small obvious typo fixes may be mechanically safe, but the normal posture is still to use a docs-only branch/PR so public `main` remains auditable and race-safe.

## Public main rules

Do not:

- force-push `main`
- rewrite public history without an explicit exceptional decision
- commit known-broken intermediate states to `main`
- merge a PR whose exact head has unreviewed changes
- treat queued CI as green
- open guarded or money-moving behavior by default
- break existing node startup paths
- weaken block, WAL, storage, signature, origin, or mutation validation merely to make a canary pass
- remove or rename public routes without compatibility notes
- commit local secrets, runtime directories, node keys, wallet files, or generated operator artifacts
- infer global follower catch-up from local `ready=true`

## Runtime and multi-node discipline

Source integration and runtime deployment are separate lifecycle steps.

- Nimo is the preferred first live canary when a bounded runtime proof is needed.
- Alienware should follow only after the Nimo canary is clean, especially for changes affecting networking, systemd, Tailscale, storage, or automatic synchronization.
- Preserve rollback paths and pre-change chain/storage backups until the replacement path has succeeded under a real canary.
- Never copy entire data directories merely to repair canonical chain state; scope state transfer to the exact proven canonical components.
- A follower background loop stays disabled while its synchronization/recovery path is under active repair or proof.

## Proof cadence

Use the public proof cadence:

- Tier 1: quick static/local smoke while editing.
- Tier 2: targeted local proof before commit/push.
- Tier 3: exact-head hosted CI/review for public integration.
- Tier 4: bounded cross-box/runtime canary only for changes that require live operational proof.

Do not run full nested cross-box bundles for a docs-only edit, and do not skip a dedicated crash/replay/storage proof for a change that touches those semantics.

## Release policy

A tag, release wall, installer, manifest, or release workflow existing in the repository is not itself an official release.

An official release candidate must begin from an exact clean `main` commit. Publication and stable promotion must follow the documented release chain:

1. Freeze the exact clean `main` commit and semantic version.
2. Produce deterministic release assets and checksum manifests.
3. Produce required SPDX SBOM and provenance/attestation evidence.
4. Pass the release qualification matrix and required approval/time-lock path.
5. Publish an immutable GitHub Release and publication receipt.
6. Run the isolated release canary and record its receipt.
7. Promote candidate/stable channel state through the reviewed promotion path.

Do not cut or promote a stable release while a runtime, storage, WAL, follower, security, installer, rollback, or qualification regression is unresolved.

Tag replacement, asset replacement, release deletion, history rewriting, and `--clobber` are not normal release operations.

Release publication is also not deployment: publishing a release must not silently restart nodes, change chain state, generate keys, alter wallet/validator/Work Credit state, or move treasury assets.

See:

- [release publication and promotion v1](release-publication-promotion-v1.md)
- [release qualification v1](release-qualification-v1.md)
- [first official release launch gate v1](first-official-release-launch-gate-v1.md)

## Documentation truth

Current-state documentation must distinguish:

- **Live** — deployed and usable within the stated boundary.
- **Bounded pilot** — real and proven but explicitly limited.
- **Guarded / under active proof** — present in source or operation but not yet authorized for general use.
- **Planned** — not yet available.

Do not describe an open PR, queued CI run, unmerged repair, or not-yet-run runtime canary as completed public capability.

Historical receipts and checkpoint documents remain immutable evidence of the state at the time they were produced; they are not automatically the current status page.

## Local secret note

Precision currently requires:

    .secrets/nodeA.key

This file must remain local, ignored, and untracked unless the systemd service is intentionally updated under a separate authorized runtime change.

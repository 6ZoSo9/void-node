# VOID Public Branch and Release Policy

status: active_public_operator_guidance
updated_at_utc: 20260528-050000

## Purpose

VOID Mainnet-0 is public-live. Public users and future public nodes may pull from the repository.

That means `main` is no longer a scratchpad.

## Branch model

Use this model:

- `main` is the public stable lane.
- Feature branches are for development.
- Tags are public checkpoint anchors.
- Precision is the source-of-truth builder/prover.
- Alienware is the public-main follower and checkpoint closeout box.

## Normal workflow

For normal work:

1. Create a feature branch.
2. Make the change on Precision.
3. Run the targeted local proof for the lane touched.
4. Run `make mainnet0-status-smoke`.
5. Merge to `main` only when the branch is clean.
6. Tag `main` only for meaningful checkpoints.
7. Sync Alienware only for checkpoint closeout or significant public changes.

## What requires a branch

Use a branch for:

- runtime code
- protocol logic
- validator lifecycle
- wallet behavior
- Buy VOID
- Work Credits
- DataNet
- relayers
- public API behavior
- security policy
- proof scripts
- anything that can affect public users or public nodes

## What can be direct-to-main

Small typo fixes or tiny docs-only updates may be direct-to-main if they are safe and obvious.

Even then, prefer a branch when unsure.

## Public main rules

Do not:

- force-push `main`
- rewrite public history without an explicit decision
- commit known-broken intermediate states to `main`
- open guarded/money-moving behavior by default
- break existing node startup paths
- remove or rename public routes without compatibility notes
- commit local secrets, runtime directories, or generated operator artifacts

## Proof cadence

Use the public proof cadence:

- Tier 1: quick local smoke while editing
- Tier 2: targeted local proof before commit
- Tier 3: cross-box closeout only for meaningful checkpoints

Do not run full nested cross-box bundles for small edits.

## Local secret note

Precision currently requires:

    .secrets/nodeA.key

This file must remain local, ignored, and untracked unless the systemd service is intentionally updated.

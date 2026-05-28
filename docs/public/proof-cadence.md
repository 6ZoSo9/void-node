# VOID Public Proof Cadence

status: active_public_operator_guidance
updated_at_utc: 20260528-013500

## Purpose

VOID is public-live, so proofs still matter.

But not every edit needs the full cross-box proof stack. Full proof bundles are intentionally heavy and should be reserved for checkpoint closeout.

This document defines a lighter proof cadence for public repo development.

## Tier 1: quick local smoke

Use while actively editing.

Expected duration: short.

Run:

    make mainnet0-status-smoke

Use this after small documentation, README, public docs, or proof-script edits when you only need to confirm the local node is still healthy.

Expected result:

    ready=true
    gap=0
    txroot_live=1

## Tier 2: targeted local proof

Use before commit.

Expected duration: moderate.

Run the proof for the lane you touched, then status smoke.

Examples:

    make public-github-landing-proof
    make mainnet0-status-smoke

    make public-repo-hardening-proof
    make mainnet0-status-smoke

    make public-repo-gitleaks-current-proof
    make mainnet0-status-smoke

This is the normal precommit path.

## Tier 3: full cross-box closeout

Use only after commit/tag or when closing a checkpoint.

Expected duration: heavy.

Run:

    make mainnet0-crossbox-status-smoke

For security or public-release checkpoint closeout, include the lane-specific proof before the cross-box smoke.

Examples:

    make public-github-landing-proof
    make mainnet0-crossbox-status-smoke

    make public-repo-gitleaks-current-proof
    make mainnet0-crossbox-status-smoke

## What not to do by default

Do not run every public proof bundle after every small edit.

Do not run full cross-box closeout before every commit.

Do not restart both boxes unless the lane needs cross-box runtime truth.

Do not treat proof slowness as a sign that VOID is unhealthy unless the readiness or smoke proof actually fails.

## Public-live note

VOID being public-live means readiness matters more, not that every proof must be heavy.

The slow part is usually nested proof repetition, gitleaks scans, SSH/Tailscale auth, service restarts, and cross-box checks.

The local readiness check should usually be fast.

## Required local secret note

Precision currently requires this local file for the node service:

    .secrets/nodeA.key

That file must remain local, ignored, and untracked.

Do not move it out of the working directory unless the systemd service is updated first.

# Public Node Alienware Rejoin Runbook v1

Marker: `VOID_PUBLIC_NODE_ALIENWARE_REJOIN_RUNBOOK_V1`

## Purpose

Alienware is temporarily offline after a storm.

This runbook defines how to rejoin Alienware later without confusing Precision-only green with cross-box green.

## Current Precision baseline

Precision-only baseline:

- commit `0f44b8d7`
- tag `ckpt-public-node-precision-only-storm-baseline-green-20260612-084430`
- marker `VOID_PUBLIC_NODE_PRECISION_ONLY_STORM_BASELINE_V1_GREEN`

This is not cross-box green.

## Rejoin rule

When Alienware comes back online, it must sync to Precision `main` before any cross-box claim.

Minimum expected target:

- Alienware reaches commit `0f44b8d7` or newer
- Alienware has the storm baseline tag or a newer Public Node tag
- Alienware service reaches ready state
- Alienware reruns the relevant Public Node proof stack locally

## Alienware sync commands

Run on Alienware:

    cd "$HOME/dev/void-node" || exit 1
    export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

    git fetch origin main --tags
    git checkout main
    git reset --hard origin/main

    echo "head=$(git rev-parse --short HEAD)"
    git tag --points-at HEAD | sort
    git status --short

## Alienware service commands

Run on Alienware after sync:

    systemctl --user restart void-node.service
    sleep 5
    systemctl --user is-active void-node.service
    curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json

## Alienware proof commands

Run on Alienware after service is ready:

    bash ops/mainnet0/public-node-local-data-drop-weighted-status-card-closeout-proof.sh
    bash ops/mainnet0/public-node-local-data-drop-object-browser-card-closeout-proof.sh
    bash ops/mainnet0/public-node-local-data-drop-import-own-data-card-closeout-proof.sh
    bash ops/mainnet0/public-node-local-data-drop-human-demo-closeout-proof.sh
    bash ops/mainnet0/public-node-local-data-drop-human-demo-top-card-closeout-proof.sh
    bash ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-closeout-proof.sh

## Cross-box rule

Only after Alienware runs those proofs green may a later closeout say cross-box green.

Until then, use:

- Precision-only green
- Alienware deferred
- cross-box pending

Do not say cross-box green yet.

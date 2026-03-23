# VOID Node - Public Beta Quickstart

## Fastest path

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent:

    make public-beta

## What this currently proves

- install/build path
- public-beta preflight gate
- main node health
- isolated node health
- isolated helper/pool visibility
- real DataNet publish/fetch/verified-receipt loop
- isolated per-address WC earnings delta inside a fresh-user root
- demo proof path

## What this does not yet prove

- that every broader demo/proposer/follower surface is as stable as the isolated wallet-proof gate

## If it fails

Run these in order:

    cd "$HOME/dev/void-node"
    make public-beta-preflight
    make wc-wallet-proof
    ./ops/install-path-status.sh
    ./ops/demo-smoke-follower.sh
    ./ops/demo-video-proof.sh

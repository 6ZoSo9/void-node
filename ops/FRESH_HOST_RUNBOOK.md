# VOID Node — Fresh Host Runbook

## Goal
Bring up a working local VOID main node and follower sync loop on a fresh Ubuntu host using the thin installer path.

## Assumptions
- Ubuntu 24.04 user session with systemd --user
- repo is already cloned at ~/dev/void-node
- Node/npm are already installed
- user has a writable home directory

## 1. Preferred one-shot install path

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

## 2. Manual step-by-step path

    cd "$HOME/dev/void-node"
    ./ops/install-devbox-ubuntu.sh

    cd "$HOME/dev/void-node"
    ./ops/install-user-units.sh

    cd "$HOME/dev/void-node"
    ./ops/first-run-smoke.sh

## 3. Canonical proof after install

    cd "$HOME/dev/void-node"
    ./ops/thin-path-proof.sh





## 3c. Clean user-facing demo proof

    cd "$HOME/dev/void-node"
    ./ops/demo-video-proof.sh

Equivalent make target:

    make demo-video-proof## 3b. Clean user-session proof

    cd "$HOME/dev/void-node"
    ./ops/clean-user-session-proof.sh

For a follower-only bounded proof after install:

    cd "$HOME/dev/void-node"
    ./ops/demo-smoke-follower.sh

## 4. Manual day-2 commands

### Restart main

    systemctl --user restart void-node.service

### Restart follower timer

    systemctl --user restart void-follower-once.timer

### Check proposer truth

    curl -fsS --max-time 5 http://127.0.0.1:4100/proposer/status ; echo

### Check submit-path truth

    curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/submit_path_truth.json ; echo

### Run canonical proof

    cd "$HOME/dev/void-node"
    ./ops/thin-path-proof.sh

### Run legacy compatibility wrapper

    cd "$HOME/dev/void-node"
    ./ops/post-install-demo.sh

### Run bounded follower proof only

    cd "$HOME/dev/void-node"
    ./ops/demo-smoke-follower.sh

## 5. Expected success signals
- /head.txt responds on 127.0.0.1:4100
- proposer/status shows "enabled": true
- submitted tx appears in /blocks/<n>/persisted
- submit-path truth shows:
  - node_txQueue_size: 0
  - global___void_tx_queue_size: 0
  - legacy_global_queue_is_noise: true
- canonical proof (`./ops/thin-path-proof.sh`) includes autoprop, full demo, follower proof, and final snapshot
- legacy wrapper (`./ops/post-install-demo.sh`) is kept for compatibility and must not call the canonical proof internally
- follower bounded proof only (`./ops/demo-smoke-follower.sh`) shows:
  - lag=0
  - main_health=ok
  - follower_health=ok
- install-path follower section is snapshot-only and may show transient lag between timer runs

## 6. Known current reality
- this path is proven on the dev workstation
- it is not yet proven on a truly fresh VM or new user
- local dirty Makefile is not part of this runbook
- follower user unit must include `Environment=SRC=http://127.0.0.1:4100` so `scripts/follower_once.ts` follows the main HTTP node instead of falling back to legacy `:4300`

## Known Good Baseline (2026-03-21)

Use this as the canonical proof path on a live install:

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

Or, once installed already:

    cd "$HOME/dev/void-node"
    ./ops/thin-path-proof.sh

Equivalent make target:

    make thin-path-proof

Notes:

- Smoke checks are range-based across sealed blocks.
- Do not assume the submitted tx must appear in the latest head block.
- With autoprop enabled, one block may seal the tx and a later head may already exist by the time the script checks persisted state.

Pinned references:

- commit `0b5ed89`
- commit `e738339`
- tags `ckpt-demo-smoke-main-rangefix-20260321-190409`
- tags `ckpt-autoprop-smoke-rangefix-20260321-185210`


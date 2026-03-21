# VOID Node — Fresh Host Runbook

## Goal
Bring up a working local VOID main node and follower sync loop on a fresh Ubuntu host using the thin installer path.

## Assumptions
- Ubuntu 24.04 user session with systemd --user
- repo is already cloned at ~/dev/void-node
- Node/npm are already installed
- user has a writable home directory

## 1. Install/build

    cd "$HOME/dev/void-node"
    ./ops/install-devbox-ubuntu.sh

## 2. Install user units

    cd "$HOME/dev/void-node"
    ./ops/install-user-units.sh

## 3. First-run verification

    cd "$HOME/dev/void-node"
    ./ops/first-run-smoke.sh

## 4. Manual day-2 commands

### Restart main

    systemctl --user restart void-node.service

### Restart follower timer

    systemctl --user restart void-follower-once.timer

### Check proposer truth

    curl -fsS --max-time 5 http://127.0.0.1:4100/proposer/status ; echo

### Check submit-path truth

    curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/submit_path_truth.json ; echo

### Run demo proof

    cd "$HOME/dev/void-node"
    ./ops/demo-all.sh

## 5. Expected success signals
- /head.txt responds on 127.0.0.1:4100
- proposer/status shows "enabled": true
- submitted tx appears in /blocks/<n>/persisted
- submit-path truth shows:
  - node_txQueue_size: 0
  - global___void_tx_queue_size: 0
  - legacy_global_queue_is_noise: true
- follower status shows:
  - lag=0
  - main_health=ok
  - follower_health=ok

## 6. Known current reality
- this path is proven on the dev workstation
- it is not yet proven on a truly fresh VM or new user
- local dirty Makefile is not part of this runbook

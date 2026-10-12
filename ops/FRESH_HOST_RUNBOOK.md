# VOID Node — Fresh Host Runbook

## Goal
Bring up a working local VOID main node and follower sync loop on a fresh Ubuntu host using the thin installer path.

## Assumptions
- Ubuntu 24.04 user session with systemd --user
- repo is already cloned at ~/dev/void-node
- Node/npm are already installed
- user has a writable home directory

## 1. Preferred public-beta path

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta

## 2. Preferred bounded proof gates

    cd "$HOME/dev/void-node"
    make wc-wallet-proof

    cd "$HOME/dev/void-node"
    make public-beta-preflight

What these prove today:

- isolated node health
- isolated helper/pool visibility
- real DataNet publish -> fetch -> verified receipt flow
- isolated per-wallet WC delta:
  - wallet A earns `1 WC`
  - wallet B earns `0`
- ledger truth and receipt truth match the credited wallet

## 3. Manual step-by-step install path

    cd "$HOME/dev/void-node"
    ./ops/install-devbox-ubuntu.sh

    cd "$HOME/dev/void-node"
    ./ops/install-user-units.sh

    cd "$HOME/dev/void-node"
    ./ops/first-run-smoke.sh

## 3b. Broader demo proof

    cd "$HOME/dev/void-node"
    ./ops/demo-video-proof.sh

Equivalent make target:

    make demo-video-proof

## 3c. Legacy canonical thin-path proof

    cd "$HOME/dev/void-node"
    ./ops/thin-path-proof.sh

Equivalent make target:

    make thin-path-proof

## 3d. Follower-only bounded proof

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
- `./ops/public-beta-quickstart.sh` ends with `PASS public-beta-quickstart`
- `make public-beta-preflight` ends with `PASS`
- `make wc-wallet-proof` ends with `ASSERT OK` and `PASS`
- wallet A shows `1 WC` earned/redeemable in the isolated proof
- wallet B shows `0`
- isolated ledger contains a `credit` event for wallet A
- isolated receipt log contains the matching verified receipt
- `./ops/demo-video-proof.sh` ends with `full demo smoke passed`
- main helper account view on `:4312` reflects per-wallet WC correctly

## 6. Known current reality
- this path is proven on the dev workstation
- it is not yet proven on a truly fresh VM or new user
- local dirty Makefile is not part of this runbook
- follower user unit must include `Environment=SRC=http://127.0.0.1:4100` so `scripts/follower_once.ts` follows the main HTTP node instead of falling back to legacy `:4300`

## Known Good Baseline (2026-03-23)

Use this as the current proof ladder on a live install:

    cd "$HOME/dev/void-node"
    make wc-wallet-proof

    cd "$HOME/dev/void-node"
    make public-beta-preflight

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Pinned references:

- `acd8670`
- `11e2941`
- `190dd0f`
- `517d9d6`
- `f5ca378`
- `95020b1`

## Current proof scope

`./ops/public-beta-quickstart.sh` is now the preferred fresh-user/public-beta path.

Today it proves:

- install and startup path
- public-beta preflight gate
- main node health
- isolated node health
- isolated helper/pool visibility
- real DataNet publish/fetch/verified-receipt loop
- isolated per-address WC earnings delta
- broader demo proof path

Current honest caveat:

- the isolated wallet-proof gate is the tightest proof surface
- broader demo/proposer/follower surfaces exist and are useful, but they are a wider operational path than the bounded wallet-proof gate

Public beta happy path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta

# void-node
Minimal block node with segmented storage, pubsub, and HTTP APIs.

## Thin Demo / Proof Baseline (2026-03-21)

Current proven baseline on `main`:

- `make autoprop-smoke`
- `make full-demo-smoke`
- `./ops/post-install-demo.sh`
- `./ops/fresh-user-smoke.sh`

What this proves:

- submit -> seal -> persisted tx path works
- DataNet publish -> fetch -> receipt path works
- WC credit increments from DataNet receipt path
- follower converges to lag `0`
- proposer is enabled and submit-path truth stays clean

Important test behavior:

- smoke verification is range-based, not latest-head-only
- a submitted tx may land in the first sealed block after submission while a later head may already exist
- scripts therefore verify the submitted memo across the sealed block range instead of assuming it must appear in the latest head block

Reference commits/tags:

- `0b5ed89` — main demo smoke range verification
- `e738339` — autoprop smoke range verification
- `ckpt-demo-smoke-main-rangefix-20260321-190409`
- `ckpt-autoprop-smoke-rangefix-20260321-185210`


## Quick install (thin path)

For the current Ubuntu devbox/user-unit path:

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh


Clean user-facing demo proof path on `main`:

    cd "$HOME/dev/void-node"
    ./ops/demo-video-proof.sh

Equivalent make target:

    make demo-video-proof


Clean user-session proof (preserves user systemd/DBus, but drops shell profile noise):

    cd "$HOME/dev/void-node"
    ./ops/clean-user-session-proof.sh

Primary fresh-user entrypoint on `main`:

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

Canonical proof entrypoint after install:

    cd "$HOME/dev/void-node"
    ./ops/thin-path-proof.sh

Equivalent make target:

    make thin-path-proof

## Legacy quick start

    npm ci
    npm run build
    BASE=http://localhost:4100 npm run cli -- health

## Environment
See `.env.example` for the full list. Common:
- `DATA_DIR` (default: `data`)
- `HTTP_PORT` (default: `4100`)
- `P2P_PORT` (default: `4700`)
- `BOOTSTRAP_ADDRS` (comma-separated `host:port`)

## APIs
- Health: `GET /api/health`
- Head: `GET /api/head`
- Blocks: `GET /blocks/*`
- Tx: `POST /tx`, `GET /tx/lookup`, `GET /tx/receipt`, `GET /tx/status`
- Index: `POST /index/*`, `GET /index/stats`
- Peers: `GET /peers`, `POST /peers/registry/*`
- Metrics: `GET /metrics` (Prometheus text) and `GET /metrics/prom` (prom-client)

## Runbooks
See `runbook/` for operational guides.

## CI Status
![CI](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml/badge.svg)

> Note: `main-legacy` is archival; do not push. Current default: `main`.

## Thin install path

For the current Ubuntu devbox/user-unit path:

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

### Extra verification

    cd "$HOME/dev/void-node"
    ./ops/install-path-status.sh
    ./ops/thin-path-proof.sh
    ./ops/fresh-user-smoke.sh
    ./ops/post-install-demo.sh   # compatibility wrapper

### Notes
- `ops/install-all.sh` runs install/build, installs user units, and runs first-run smoke
- `./ops/install-path-status.sh` is an honest live snapshot; follower output there is not a bounded proof and may show informational oneshot/store mode status
- `./ops/thin-path-proof.sh` is the canonical bounded proof path
- `./ops/post-install-demo.sh` is a compatibility wrapper for older flows and is not the canonical entrypoint
- `./ops/demo-smoke-follower.sh` remains the follower-only bounded proof
- follower install units must include `Environment=SRC=http://127.0.0.1:4100`
- this path is proven on the current dev workstation
- `ops/FRESH_HOST_RUNBOOK.md` has the longer runbook

### Current proof scope

`./ops/demo-video-proof.sh` currently proves:

- install path / user-unit bring-up
- main node health and sealing
- follower sync proof (oneshot/store mode aware)
- DataNet publish/fetch/receipt loop
- WorkCredits pool/helper visibility

It does **not** yet prove isolated per-address WC earnings delta for a fresh-user root.
That remaining gap depends on isolated-root protocol state / broadcast artifacts and WC ledger coupling.

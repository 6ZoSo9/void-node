# void-node
Minimal block node with segmented storage, pubsub, and HTTP APIs.

## Current Proven Paths (2026-03-23)

Current green paths on `main`:

- `make wc-wallet-proof`
- `make public-beta-preflight`
- `./ops/public-beta-quickstart.sh`
- `./ops/demo-video-proof.sh`

What these currently prove:

- real DataNet publish -> fetch -> verified receipt path works
- WorkCredits credit increments from the verified DataNet receipt path
- isolated per-wallet WC proof is green:
  - wallet A earns `1 WC`
  - wallet B earns `0`
  - ledger truth and receipt truth match wallet A
- public beta quickstart is green on the current dev workstation
- main demo proof now defaults to a real wallet address instead of legacy `demo-user`

Pinned references:

- `acd8670` — wallet-specific WC awards fixed in isolated flow
- `11e2941` — isolated per-wallet WC proof runner added
- `190dd0f` — `make wc-wallet-proof` added
- `517d9d6` — `public-beta-preflight` switched to real DataNet publish/fetch/receipt proof
- `f5ca378` — `public-beta-quickstart` gated on preflight and real wallet proof
- `95020b1` — main demo proof defaults to wallet address

## Quick install / public beta path

Recommended current user-facing path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta

Recommended bounded proof gates:

    cd "$HOME/dev/void-node"
    make wc-wallet-proof
    make public-beta-preflight

Compatibility / broader demo path:

    cd "$HOME/dev/void-node"
    ./ops/demo-video-proof.sh

Equivalent make target:

    make demo-video-proof

Legacy install aggregator (still available, but not the preferred beta entrypoint):

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

Notes:

- `make wc-wallet-proof` is the tightest honest proof of wallet-specific WC awarding
- `make public-beta-preflight` is the gate that should be green before relying on the broader demo path
- `./ops/public-beta-quickstart.sh` now runs install/startup, preflight, and demo proof in sequence
- older thin/demo proof surfaces remain available, but they are no longer the primary public-beta story

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

Public beta happy path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta

# void-node
Minimal block node with segmented storage, pubsub, and HTTP APIs.

## Quick start
```bash
npm ci
npm run build
BASE=http://localhost:4100 npm run cli -- health
```

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
    ./ops/submit-path-truth-smoke.sh
    ./ops/void-follower-status.sh
    ./ops/install-path-status.sh

### Notes
- `ops/install-all.sh` runs install/build, installs user units, and runs first-run smoke
- this path is proven on the current dev workstation
- `ops/FRESH_HOST_RUNBOOK.md` has the longer runbook


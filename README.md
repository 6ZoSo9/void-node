# void-node
Minimal block node with segmented storage, pubsub, and HTTP APIs.

## Quick start
```bash
npm ci
npm run build
BASE=http://127.0.0.1:4100 npm run cli -- health
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

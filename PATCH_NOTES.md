# Void Network Additions (2025-10-26)
Scope: Additive-only changes to introduce:
- Minimal UDP P2P handshake (`src/p2p/handshake.ts`)
- Prometheus /metrics with basic counters (`src/http/metrics.ts`)
- Env loader (`src/util/env.ts`)
- P2P types (`src/types/p2p.ts`)
- Runbook (`src/runbooks/STEP-001.md`)

## Integration points
Edit `src/index.ts`:
- Import: env, metrics, startP2P
- Call `mountMetrics(app)` after creating your Express app
- Instantiate `startP2P({...})` with your real head getter
- Add `GET /p2p/peers`

These are NO-OP until you set BOOTSTRAP_ADDRS. Safe to deploy.

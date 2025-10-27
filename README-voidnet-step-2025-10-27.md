# VOID Network – Step Pack (2025‑10‑27)

This step pack **adds** (does not remove) the following pieces:
- `/p2p/peers` (GET): list known peers and connection state
- `/p2p/dial` (POST): dial a peer once (hello), add/update registry
- `/p2p/hello-now` (GET): stateless hello (if you don't already have it)
- `/follower/start|stop|status` (POST/GET): control follower loop safely
- `/metrics` wiring helper: exposes gauges/counters for head & peers
- Bash helpers under `scripts/` for quick curl-based sanity checks

## 1) File map

```
src/http/p2p_routes.ts
src/http/follower_routes.ts
src/metrics.ts
src/types/p2p.ts
src/util/interval_worker.ts
scripts/p2p_helpers.sh
scripts/follow_helpers.sh
```

## 2) How to wire (non-destructive)

Open your existing `src/index.ts` and add the following **once** (adapt as needed if you already have similar code).

```ts
// --- Add near other imports ---
import { registerP2PRoutes } from "./http/p2p_routes.js";
import { registerFollowerRoutes } from "./http/follower_routes.js";
import { Metrics } from "./metrics.js";

// --- After you create `app` and your `node` instance ---
const metrics = new Metrics();
registerP2PRoutes(app, node, metrics);
registerFollowerRoutes(app, node, metrics);

// --- If you don't already expose /metrics ---
app.get("/metrics", async (_req, res) => {
  try {
    res.type("text/plain").send(await metrics.render());
  } catch (e) {
    res.status(500).send(String(e));
  }
});
```

> If you already have a `/metrics` endpoint, just instantiate `Metrics` and use `metrics.setHead(number)` and `metrics.setPeersConnected(count)` where appropriate (e.g., on head updates and peer connect/disconnect events).

## 3) Node hooks (minimal)

These routes expect your runtime to have:

- `node.peerRegistry: PeerRegistry` with:
  - `list(): Array<{ url: string; lastHelloAt?: number; connected?: boolean }>`
  - `upsert(url: string, partial?: object)`
  - (Optional) `connectedCount(): number` – if missing, metrics will derive from `list().filter(p=>p.connected)`
- `node.getHead(): number` (or similar) – used for metrics/health
- `node.hello(): any` – returns a hello payload (chain info, head, etc.)
- `node.follower` (an object) with methods:
  - `start(peerUrl: string, intervalMs: number): Promise<void>`
  - `stop(): Promise<void>`
  - `status(): {{ running: boolean; peer?: string; intervalMs?: number }}`

If your names differ, adapt the imports in the new files accordingly.

## 4) Quick test

```bash
# P2P hello + list peers
bash scripts/p2p_helpers.sh 127.0.0.1:4100
bash scripts/p2p_helpers.sh 127.0.0.1:4101

# Dial main from follower, then start follower loop
bash scripts/follow_helpers.sh 127.0.0.1:4101 http://127.0.0.1:4100 1000

# Check metrics
curl -sS http://127.0.0.1:4100/metrics | grep -E '(void_head_number|void_peers_connected|void_follow_errors_total)'
curl -sS http://127.0.0.1:4101/metrics | grep -E '(void_head_number|void_peers_connected|void_follow_errors_total)'
```

## 5) Notes

- The endpoints are idempotent and safe to call repeatedly.
- The follower routes will refuse to start if already running; use `stop` first.
- Metrics text format is Prometheus-compatible.
- Everything is TypeScript (ESM). Adjust paths if your repo structure differs.

— Prepared: 2025-10-27T09:55:36

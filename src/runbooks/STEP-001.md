# STEP-001: Bring-up minimal P2P + metrics
These steps assume your project root is `~/dev/void-node` and systemd units exist:
- `void-node.service` (main proposer) on HTTP 4100 / P2P 4700 with DATA_DIR=data_a
- `void-node@bootstrap-1.service` (follower) on HTTP 4101 / P2P 4701 with DATA_DIR=data_b

## 1) Copy new files (additive)
Unzip bundle at project root. Files go under `src/`.

## 2) Wire metrics and P2P in `src/index.ts` (additive)
Insert near your express app setup (do not remove existing routes):

```ts
// ADD near top-level imports
import { loadEnv } from "./util/env.js"
import { mountMetrics } from "./http/metrics.js"
import { startP2P } from "./p2p/handshake.js"

// After you create `app = express()`
const env = loadEnv()
mountMetrics(app)

// Node ID: reuse your key loader if available, else fallback
const nodeId = process.env.NODE_ID || (await import('node:crypto')).randomUUID()

// Provide a cheap getHead() (replace with real head from SegStore if available)
const getHead = () => {
  try { return JSON.parse(require('node:fs').readFileSync(`${env.DATA_DIR}/heads.json`, 'utf8')).head ?? -1 }
  catch { return -1 }
}

const peers = new Map<string, {id:string,addr:string,seenAt:number}>()
const p2p = startP2P({
  host: env.P2P_HOST,
  port: env.P2P_PORT,
  bootstrap: env.BOOTSTRAP_ADDRS,
  nodeId,
  getHead,
  onPeer: (peer) => {
    const addr = `${peer.host}:${peer.port}`
    peers.set(addr, { id: peer.id, addr, seenAt: peer.seenAt })
  },
  log: (...a:any[]) => console.log(...a),
})

app.get('/p2p/peers', (_req, res) => {
  res.json({ count: peers.size, peers: [...peers.values()] })
})
```

## 3) Environment
Main (proposer):
```bash
sudo systemctl edit --full void-node
# Ensure (already present):
#   HTTP_PORT=4100
#   P2P_PORT=4700
# Add (if missing):
#   BOOTSTRAP_ADDRS=127.0.0.1:4701
sudo systemctl daemon-reload
sudo systemctl restart void-node
```

Follower:
```bash
sudo systemctl edit --full "void-node@bootstrap-1"
# Ensure:
#   HTTP_PORT=4101
#   P2P_PORT=4701
#   BOOTSTRAP_ADDRS=127.0.0.1:4700
sudo systemctl daemon-reload
sudo systemctl restart "void-node@bootstrap-1"
```

## 4) Verify
```bash
# Health (existing)
curl -sS http://localhost:4100/api/health | jq .
curl -sS http://127.0.0.1:4101/api/health | jq .

# New: peers list
curl -sS http://localhost:4100/p2p/peers | jq .
curl -sS http://127.0.0.1:4101/p2p/peers | jq .

# New: metrics
curl -sS http://localhost:4100/metrics | head -n 20
curl -sS http://127.0.0.1:4101/metrics | head -n 20
```

## 5) Grafana quick add (Prometheus scrape)
Add scrape job (if not already):
```yaml
- job_name: 'void-node'
  static_configs:
    - targets: ['127.0.0.1:4100','127.0.0.1:4101']
```

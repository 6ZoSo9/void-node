type AnyApp = any;
type AnyNode = any;

function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x instanceof Map) return Array.from(x.values());
  if (typeof x?.values === "function") { try { return Array.from(x.values()); } catch {} }
  if (typeof x === "object") return Object.values(x);
  return [];
}

function httpFromP2P(addr: string | null): string | null {
  if (!addr || typeof addr !== "string") return null;
  const m = addr.match(/^([^:]+):(\d+)$/);
  if (!m) return null;
  const host = m[1], port = Number(m[2]);
  // dev heuristic 470x -> 410x
  if (port >= 4700 && port <= 4799) return `http://${host}:${4100 + (port - 4700)}`;
  return null;
}

function getSelfId(node: AnyNode): string {
  return (node as any)?.id || (node as any)?.nodeId || "unknown";
}
function getSelfEnv() {
  const httpHost = process.env.HTTP_HOST || "127.0.0.1";
  const httpPort = process.env.HTTP_PORT || "0";
  const p2pHost  = process.env.P2P_HOST  || "127.0.0.1";
  const p2pPort  = process.env.P2P_PORT  || "0";
  return { http: `http://${httpHost}:${httpPort}`, p2p: `${p2pHost}:${p2pPort}` };
}

function collectRegistry(reg: any): Map<string, any> {
  const seen = new Map<string, any>();
  if (!reg) return seen;
  const buckets: any[] = [];
  try { if (reg.list) buckets.push(reg.list() || []); } catch {}
  try { buckets.push((reg as any).peers); } catch {}
  try { buckets.push((reg as any).records); } catch {}
  try { buckets.push((reg as any).map); } catch {}
  try { if (reg.dump) buckets.push(reg.dump()); } catch {}
  try { if (reg.snapshot) buckets.push(reg.snapshot()); } catch {}

  for (const bucket of buckets) {
    for (const r of toArray(bucket)) {
      const id = r?.id || r?.peerId;
      if (!id) continue;
      const prev = seen.get(id) || {};
      seen.set(id, { ...prev, ...r });
    }
  }
  return seen;
}

function collectLive(node: AnyNode): Map<string, any> {
  const liveMap = (node as any).peers || (node as any)._peers || (node as any).peerMap;
  const out = new Map<string, any>();
  for (const p of toArray(liveMap)) {
    const id = p?.id || p?.peerId;
    if (!id) continue;
    const prev = out.get(id) || {};
    out.set(id, { ...prev, ...p });
  }
  return out;
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/self", (_req: any, res: any) => {
    try {
      const id = getSelfId(node);
      const env = getSelfEnv();
      res.json({ ok: true, id, http: env.http, p2p: env.p2p });
    } catch (e: any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });

  app.get("/p2p/peers", (_req: any, res: any) => {
    try {
      const now = Date.now();
      const selfId = getSelfId(node);
      const env = getSelfEnv();

      const reg = collectRegistry((node as any).peerRegistry);
      const live = collectLive(node);

      const ids = new Set<string>([...reg.keys(), ...live.keys()]);
      const out: any[] = [];
      for (const id of ids) {
        // Skip self (we want only remote peers)
        if (id === selfId || id === "unknown") continue;

        const r = reg.get(id) || {};
        const p = live.get(id) || {};

        // Prefer advertised listeners over ephemerals
        const advertisedP2P =
          r.p2pListen || r.p2p || r.addr ||
          p.p2pListen || p.p2p || p.addr || null;

        // Choose http: registry http*, then live http*, then synthesize from advertised p2p
        const http =
          r.httpAddr || r.http || p.httpAddr || p.http ||
          httpFromP2P(advertisedP2P ? String(advertisedP2P) : null) ||
          null;

        const connected   = Boolean(p.connected ?? p.isConnected ?? true);
        const lastSeenMs  = typeof p.lastSeenMs === "number" ? p.lastSeenMs
                         : typeof r.lastSeenMs === "number" ? r.lastSeenMs
                         : null;
        const lastSeenAgo = typeof lastSeenMs === "number" ? (now - lastSeenMs) : null;

        out.push({
          id,
          http,
          p2p: advertisedP2P || null,
          connected,
          lastSeenMs,
          lastSeenAgoMs: lastSeenAgo,
          rttMs: p.rttMs ?? r.rttMs ?? null,
          score: p.score ?? r.score ?? null,
        });
      }

      res.json({ ok: true, count: out.length, peers: out });
    } catch (e: any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

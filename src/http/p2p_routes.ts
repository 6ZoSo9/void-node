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
  if (port >= 4700 && port <= 4799) return `http://${host}:${4100 + (port - 4700)}`;
  return null;
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
      const id = r?.id || r?.peerId || r?.nodeId || r?.key || r?.k;
      if (!id) continue;
      const cur = seen.get(id) || {};
      // normalize common fields if present
      cur.id = id;
      cur.httpAddr = cur.httpAddr ?? r?.httpAddr ?? r?.http ?? r?.http_url ?? null;
      cur.p2p = cur.p2p ?? r?.p2p ?? r?.addr ?? null;
      cur.p2pListen = cur.p2pListen ?? r?.p2pListen ?? r?.listen ?? r?.listens?.[0] ?? null;
      cur.lastSeenMs = cur.lastSeenMs ?? r?.lastSeenMs ?? null;
      cur.rttMs = cur.rttMs ?? r?.rttMs ?? null;
      cur.score = cur.score ?? r?.score ?? null;
      seen.set(id, cur);
    }
  }
  return seen;
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/peers", (_req: any, res: any) => {
    try {
      const livePeers = toArray((node as any)?.peers || (node as any)?.p2p?.peers);
      const regPeers  = collectRegistry((node as any)?.peerRegistry);
      const out: any[] = [];

      for (const lp of livePeers) {
        const id  = lp?.id || lp?.peerId || lp?.nodeId || "unknown";
        const rec = regPeers.get(id) || {};
        const p2pListen: string | null = rec?.p2pListen || null;
        const liveP2P: string | null = String(lp?.addr || lp?.p2p || "") || null;

        // Prefer stable listener from HELLO; fall back to live socket
        const p2p = (p2pListen || liveP2P) || null;
        const httpSynth = httpFromP2P(p2pListen || p2p);
        const http = rec?.httpAddr || lp?.http || httpSynth || null;

        out.push({
          id,
          http,
          p2p,
          connected: !!lp?.socket || !!lp?.connected,
          lastSeenMs: rec?.lastSeenMs ?? null,
          lastSeenAgoMs: (rec?.lastSeenMs ? (Date.now() - rec.lastSeenMs) : null),
          rttMs: rec?.rttMs ?? null,
          score: rec?.score ?? null,
        });
      }

      res.json({ ok: true, count: out.length, peers: out });
    } catch (e: any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

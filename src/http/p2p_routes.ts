type AnyApp = any;
type AnyNode = any;

function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x instanceof Map) return Array.from(x.values());
  if (typeof (x as any)?.values === "function") { try { return Array.from((x as any).values()); } catch {} }
  if (typeof x === "object") return Object.values(x);
  return [];
}

function httpFromP2P(addr: string | null): string | null {
  if (!addr || typeof addr !== "string") return null;
  const m = addr.match(/^([^:]+):(\d+)$/);
  if (!m) return null;
  const host = m[1], port = Number(m[2]);
  // dev heuristic: 470x -> 410x
  if (port >= 4700 && port <= 4799) return `http://${host}:${4100 + (port - 4700)}`;
  return null;
}

function enumeratePeers(node: AnyNode): any[] {
  const out: any[] = [];

  // PeerRegistry (preferred)
  const pr = (node as any).peerRegistry;
  if (pr) {
    if (typeof pr.list === "function")  { try { out.push(...(pr.list() || [])); } catch {} }
    try { out.push(...toArray((pr as any).peers)); } catch {}
    if (typeof pr.dump === "function")      { try { out.push(...toArray(pr.dump())); } catch {} }
    if (typeof pr.snapshot === "function")  { try { out.push(...toArray(pr.snapshot())); } catch {} }
  }

  // Fallback node peer maps
  const p = (node as any).peers || (node as any)._peers || (node as any).peerMap;
  if (p) {
    if (typeof p.list === "function")  { try { out.push(...(p.list() || [])); } catch {} }
    try { out.push(...toArray(p)); } catch {}
  }

  // Dedup by (id|p2p|http)
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const it of out) {
    const id = it?.id || it?.peerId || "unknown";

    // Prefer advertised listener over ephemeral
    const advertised = it?.p2pListen || it?.theyListen || null;
    const p2p = advertised
      || it?.p2p || it?.p2pAddr || it?.p2pAddress
      || it?.addr || it?.address || it?.remoteAddr
      || null;

    // If no http provided, synthesize from advertised p2p
    const http = it?.http || it?.httpAddr || it?.httpURL || it?.httpUrl
      || (advertised ? httpFromP2P(String(advertised)) : null)
      || null;

    const key = `${id}|${p2p || ""}|${http || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lastSeenMs = (typeof it?.lastSeenMs === "number") ? it.lastSeenMs : null;
    dedup.push({
      id,
      http,
      p2p,
      connected: Boolean(it?.connected ?? it?.isConnected ?? true),
      lastSeenMs,
      lastSeenAgoMs: (lastSeenMs != null) ? (Date.now() - lastSeenMs) : null,
      rttMs: it?.rttMs ?? null,
      score: it?.score ?? null,
    });
  }
  return dedup;
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/self", (_req, res) => {
    try {
      const http = `http://${process.env.HTTP_HOST || "127.0.0.1"}:${process.env.HTTP_PORT || "0"}`;
      const p2p  = `${process.env.P2P_HOST  || "127.0.0.1"}:${process.env.P2P_PORT  || "0"}`;
      const id   = (node as any)?.id || (node as any)?.nodeId || "unknown";
      res.json({ ok: true, id, http, p2p });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });

  app.get("/p2p/peers", (_req, res) => {
    try {
      const list = enumeratePeers(node);
      res.json({ ok: true, count: list.length, peers: list });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

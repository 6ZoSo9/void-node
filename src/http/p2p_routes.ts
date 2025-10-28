type AnyApp = any;
type AnyNode = any;

function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x instanceof Map) return Array.from(x.values());
  if (typeof x.values === "function") {
    try { return Array.from(x.values()); } catch {}
  }
  if (typeof x === "object") return Object.values(x);
  return [];
}

function enumeratePeers(node: AnyNode): any[] {
  const out: any[] = [];

  // Try peerRegistry first (most canonical)
  const pr = (node as any).peerRegistry;
  if (pr) {
    if (typeof pr.list === "function") {
      try { out.push(...(pr.list() || [])); } catch {}
    }
    try { out.push(...toArray((pr as any).peers)); } catch {}
    if (typeof pr.dump === "function") {
      try { out.push(...toArray(pr.dump())); } catch {}
    }
    if (typeof pr.snapshot === "function") {
      try { out.push(...toArray(pr.snapshot())); } catch {}
    }
  }

  // Then fall back to node.peers or other internal maps
  const p = (node as any).peers || (node as any)._peers || (node as any).peerMap;
  if (p) {
    if (typeof p.list === "function") {
      try { out.push(...(p.list() || [])); } catch {}
    }
    try { out.push(...toArray(p)); } catch {}
  }

  // De-dup by id/http/p2p tuple
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const it of out) {
    const id  = it?.id || it?.peerId || "unknown";
    const http = it?.http || it?.httpAddr || null;
    const p2p  = it?.p2p  || it?.p2pAddr  || null;
    const key = `${id}|${http}|${p2p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(it);
  }
  return dedup;
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/peers", (_req, res) => {
    try {
      const now = Date.now();
      const list = enumeratePeers(node).map((p: any) => ({
        id: p.id || p.peerId || "unknown",
        http: p.http || p.httpAddr || null,
        p2p: p.p2p || p.p2pAddr || null,
        connected: Boolean(p.connected ?? p.isConnected ?? true),
        lastSeenMs: typeof p.lastSeenMs === "number" ? p.lastSeenMs : (typeof p.tsLastSeen === "number" ? p.tsLastSeen : null),
        lastSeenAgoMs: (() => {
          const t = (typeof p.lastSeenMs === "number") ? p.lastSeenMs :
                    (typeof p.tsLastSeen === "number") ? p.tsLastSeen : null;
          return (t == null) ? null : (now - t);
        })(),
        rttMs: p.rttMs ?? p.rtt ?? null,
        score: p.score ?? null,
      }));
      res.json({ ok: true, count: list.length, peers: list });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

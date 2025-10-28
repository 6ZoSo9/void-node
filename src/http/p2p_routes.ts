type AnyApp = any;
type AnyNode = any;

function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x instanceof Map) return Array.from(x.values());
  if (typeof x.values === "function") { try { return Array.from(x.values()); } catch {} }
  if (typeof x === "object") return Object.values(x);
  return [];
}

function enumeratePeers(node: AnyNode): any[] {
  const out: any[] = [];

  const pr = (node as any).peerRegistry;
  if (pr) {
    if (typeof pr.list === "function") { try { out.push(...(pr.list() || [])); } catch {} }
    try { out.push(...toArray((pr as any).peers)); } catch {}
    if (typeof pr.dump === "function")     { try { out.push(...toArray(pr.dump())); } catch {} }
    if (typeof pr.snapshot === "function") { try { out.push(...toArray(pr.snapshot())); } catch {} }
  }

  const p = (node as any).peers || (node as any)._peers || (node as any).peerMap;
  if (p) {
    if (typeof p.list === "function") { try { out.push(...(p.list() || [])); } catch {} }
    try { out.push(...toArray(p)); } catch {}
  }

  // De-dup by (id|http|p2p) tuple
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const it of out) {
    const id  = it?.id || it?.peerId || "unknown";
    const http = it?.http || it?.httpAddr || it?.httpURL || it?.httpUrl || null;
    const p2p  = it?.p2p  || it?.p2pAddr  || it?.p2pAddress || null;
    const key = `${id}|${http}|${p2p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(it);
  }
  return dedup;
}

function coalesceHost(obj: any): string | null {
  return obj?.host || obj?.hostName || obj?.hostname || obj?.ip || obj?.addr || obj?.address || null;
}
function coalesce(obj: any, keys: string[]): any {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return null;
}
function synthHttp(obj: any, host: string | null): string | null {
  const port = coalesce(obj, ["httpPort", "http_port", "http", "portHttp", "port_http", "webPort"]);
  if (typeof port === "number") return `http://${host ?? "127.0.0.1"}:${port}`;
  if (typeof port === "string" && /^\d+$/.test(port)) return `http://${host ?? "127.0.0.1"}:${port}`;
  const url = coalesce(obj, ["httpURL", "httpUrl", "httpAddr", "http_address"]);
  return typeof url === "string" ? url : null;
}
function synthP2P(obj: any, host: string | null): string | null {
  const port = coalesce(obj, ["p2pPort", "p2p_port", "p2p", "portP2p", "port_p2p"]);
  if (typeof port === "number") return `${host ?? "127.0.0.1"}:${port}`;
  if (typeof port === "string" && /^\d+$/.test(port)) return `${host ?? "127.0.0.1"}:${port}`;
  return coalesce(obj, ["p2pAddr", "p2pAddress", "p2p_hostport"]);
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/peers", (_req, res) => {
    try {
      const now = Date.now();
      const raw = enumeratePeers(node);

      const list = raw.map((p: any) => {
        const id   = p.id || p.peerId || "unknown";
        let http   = p.http || p.httpAddr || p.httpURL || p.httpUrl || null;
        let p2p    = p.p2p  || p.p2pAddr  || p.p2pAddress || null;

        // Try to synthesize when nulls
        const host = coalesceHost(p) || coalesceHost(p.info || {}) || coalesceHost(p.meta || {});
        if (!http) http = synthHttp(p, host) || synthHttp(p.info || {}, host) || synthHttp(p.meta || {}, host);
        if (!p2p)  p2p  = synthP2P(p, host)  || synthP2P(p.info || {}, host)  || synthP2P(p.meta || {}, host);

        const connected = Boolean(p.connected ?? p.isConnected ?? p.alive ?? true);
        const lastSeen  = coalesce(p, ["lastSeenMs", "tsLastSeen", "lastSeen"]);
        const rtt       = coalesce(p, ["rttMs", "rtt"]);

        return {
          id,
          http: typeof http === "string" ? http : null,
          p2p : typeof p2p  === "string" ? p2p  : null,
          connected,
          lastSeenMs: (typeof lastSeen === "number") ? lastSeen : null,
          lastSeenAgoMs: (typeof lastSeen === "number") ? (now - lastSeen) : null,
          rttMs: (typeof rtt === "number") ? rtt : null,
          score: coalesce(p, ["score", "peerScore"]) ?? null,
        };
      });

      // optional: reflect into metrics if supported (no-op if not)
      try {
        (node as any)?.metrics?.set?.("void_peers_known", list.length);
        const connected = list.filter(x => x.connected).length;
        (node as any)?.metrics?.set?.("void_peers_connected", connected);
      } catch {}

      res.json({ ok: true, count: list.length, peers: list });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });

  // Bonus: quick self snapshot
  app.get("/p2p/self", (_req, res) => {
    try {
      const cfg = (node as any)?.config || {};
      res.json({
        ok: true,
        id: (node as any)?.id || null,
        http: `http://${cfg.HTTP_HOST ?? "127.0.0.1"}:${cfg.HTTP_PORT ?? 0}`,
        p2p: `${cfg.P2P_HOST ?? "127.0.0.1"}:${cfg.P2P_PORT ?? 0}`,
      });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

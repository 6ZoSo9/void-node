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
  // dedup by (id|http|p2p) tuple
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const it of out) {
    const id  = it?.id || it?.peerId || "unknown";
    const http = it?.http || it?.httpAddr || it?.httpURL || it?.httpUrl || null;
    const p2p  = it?.p2p  || it?.p2pAddr  || it?.p2pAddress || it?.addr || it?.address || null;
    const key = `${id}|${http}|${p2p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(it);
  }
  return dedup;
}

function coalesce(obj: any, keys: string[]): any {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return null;
}

function parseHostPort(s: string | null): {host:string, port:number} | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^([^:]+):(\d+)$/);
  if (!m) return null;
  return { host: m[1], port: Number(m[2]) };
}

// Dev heuristic: p2p :470x -> http :410x
function httpFromP2P(p2p: string | null): string | null {
  const hp = parseHostPort(p2p);
  if (!hp) return null;
  if (hp.port >= 4700 && hp.port <= 4799) {
    const httpPort = 4100 + (hp.port - 4700);
    return `http://${hp.host}:${httpPort}`;
  }
  return null;
}

// Prefer advertised listener over ephemeral remote
function chooseP2P(it: any): string | null {
  // Any of these may exist on conn/registry entries:
  const advertised = coalesce(it, [
    "p2pListen", "p2p_listen", "listenP2P", "listeningP2P",
    "theyListen", "theirListen", "listening", "listeningAddr",
    "peerListen", "remoteListen", "p2p_hostport"
  ]);
  if (typeof advertised === "string") return advertised;

  // Fallbacks that might contain the ephemeral remote
  const raw = coalesce(it, ["p2p", "p2pAddr", "p2pAddress", "addr", "address"]);
  const hp = parseHostPort(typeof raw === "string" ? raw : null);
  if (!hp) return typeof raw === "string" ? raw : null;

  // If it looks like an ephemeral port (not 47xx dev range), keep it
  if (hp.port < 4700 || hp.port > 4899) return `${hp.host}:${hp.port}`;

  return `${hp.host}:${hp.port}`;
}

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/peers", (_req, res) => {
    try {
      const now = Date.now();
      const raw = enumeratePeers(node);

      const list = raw.map((p: any) => {
        const id   = p.id || p.peerId || "unknown";
        let p2p    = chooseP2P(p);
        let http   = p.http || p.httpAddr || p.httpURL || p.httpUrl || null;

        // If http still unknown, synthesize from the best p2p we have
        if (!http) http = httpFromP2P(typeof p2p === "string" ? p2p : null);

        const connected = Boolean(p.connected ?? p.isConnected ?? p.alive ?? true);
        const lastSeen  = coalesce(p, ["lastSeenMs", "tsLastSeen", "lastSeen"]);
        const rtt       = coalesce(p, ["rttMs", "rtt", "latency"]);

        return {
          id,
          http: (typeof http === "string") ? http : null,
          p2p : (typeof p2p  === "string") ? p2p  : null,
          connected,
          lastSeenMs: (typeof lastSeen === "number") ? lastSeen : null,
          lastSeenAgoMs: (typeof lastSeen === "number") ? (now - lastSeen) : null,
          rttMs: (typeof rtt === "number") ? rtt : null,
          score: coalesce(p, ["score", "peerScore"]) ?? null,
        };
      });

      try {
        (node as any)?.metrics?.set?.("void_peers_known", list.length);
        const c = list.filter(x => x.connected).length;
        (node as any)?.metrics?.set?.("void_peers_connected", c);
      } catch {}

      res.json({ ok: true, count: list.length, peers: list });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });

  app.get("/p2p/self", (_req, res) => {
    try {
      const env = process.env as any;
      const host = env.HTTP_HOST || env.VOID_HTTP_HOST || "127.0.0.1";
      const port = Number(env.HTTP_PORT || env.VOID_HTTP_PORT || 0);
      const p2pHost = env.P2P_HOST || env.VOID_P2P_HOST || host;
      const p2pPort = Number(env.P2P_PORT || env.VOID_P2P_PORT || 0);
      res.json({
        ok: true,
        id: (node as any)?.id || null,
        http: `http://${host}:${port}`,
        p2p: `${p2pHost}:${p2pPort}`,
      });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

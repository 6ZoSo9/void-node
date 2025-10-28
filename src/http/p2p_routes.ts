type AnyApp = any;
type AnyNode = any;

export function registerP2PRoutes(app: AnyApp, node: AnyNode) {
  app.get("/p2p/peers", (_req, res) => {
    try {
      const now = Date.now();
      // Be defensive across shapes: prefer node.peerRegistry if it exists
      const list = (node.peerRegistry?.list?.() || node.peers?.list?.() || [])
        .map((p: any) => ({
          id: p.id || p.peerId || "unknown",
          http: p.http || p.httpAddr || null,
          p2p: p.p2p || p.p2pAddr || null,
          connected: Boolean(p.connected ?? p.isConnected ?? true),
          lastSeenMs: typeof p.lastSeenMs === "number" ? p.lastSeenMs : null,
          lastSeenAgoMs: typeof p.lastSeenMs === "number" ? (now - p.lastSeenMs) : null,
          rttMs: p.rttMs ?? null,
          score: p.score ?? null,
        }));
      res.json({ ok: true, count: list.length, peers: list });
    } catch (e:any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

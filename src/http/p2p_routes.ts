// src/http/p2p_routes.ts
import type express from "express";

export function registerP2PRoutes(app: express.Express, node: any) {
  // Dial another node's P2P address, e.g. 127.0.0.1:4700
  const doDial = (addr: string) => {
    if (!addr || !/^[^:]+:\d+$/.test(addr)) return { ok: false, error: "bad addr" };
    try {
      if (typeof node.connect === "function") {
        node.connect(addr);
        return { ok: true, dialing: addr };
      }
      return { ok: false, error: "node.connect() not available" };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  };

  app.get("/p2p/dial", (req, res) => {
    const addr = String(req.query.addr || "");
    res.json(doDial(addr));
  });

  app.post("/p2p/dial", (req, res) => {
    const addr = String((req.body && (req.body.addr ?? req.query.addr)) || "");
    res.json(doDial(addr));
  });

  // Quick hello/snapshot; returns JSON always
  app.get("/p2p/hello-now", (_req, res) => {
    try {
      const listen = Array.isArray(node.listenAddrs) ? node.listenAddrs : [];
      const peers = Array.isArray(node.peers) ? node.peers.length : (node.peers?.size ?? 0);
      const snap = typeof node.peersSnapshot === "function" ? node.peersSnapshot() : { connected: [], knownAddrs: [] };
      res.json({ ok: true, id: node.id, listen, peers, ...snap });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Extra helpers (always JSON)
  app.get("/p2p/peers", (_req, res) => {
    try {
      const snap = typeof node.peersSnapshot === "function" ? node.peersSnapshot() : { connected: [], knownAddrs: [] };
      res.json({ ok: true, ...snap });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.get("/p2p/listen", (_req, res) => {
    const listen = Array.isArray(node.listenAddrs) ? node.listenAddrs : [];
    res.json({ ok: true, listen });
  });

  app.get("/p2p/known", (_req, res) => {
    const known = Array.isArray(node.knownAddrs) ? node.knownAddrs : [...(node.knownAddrs ?? [])];
    res.json({ ok: true, known });
  });
}


import type { Express, Request, Response } from "express";

type NodeLike = {
  id?: string;
  getHead?: () => number;
  peersSnapshot?: () => { connected: any[]; knownAddrs: string[] };
};

export function registerP2PRoutes(app: Express, node: NodeLike) {
  // Simple hello endpoint with head (if provided)
  app.get("/p2p/hello-now", (_req: Request, res: Response) => {
    const head = typeof node.getHead === "function" ? node.getHead() : undefined;
    res.json({ ok: true, nodeId: node.id, head });
  });

  // Expose peers known by the in-process p2p shim in node_core
  app.get("/p2p/peers", (_req: Request, res: Response) => {
    try {
      const snap = typeof node.peersSnapshot === "function"
        ? node.peersSnapshot()
        : { connected: [], knownAddrs: [] };
      res.json({ ok: true, ...snap });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
}

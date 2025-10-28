// dev-only routes to help testing tx indexing
export function registerDevRoutes(app: any, node: any) {
  // POST /dev/emit-tx { data?: string }
  app.post("/dev/emit-tx", (req: any, res: any) => {
    try {
      const body = (req && req.body) || {};
      const data = (typeof body.data === "string") ? body.data : "hello-void";
      const h = (Math.random().toString(16).slice(2)).padEnd(64, '0'); // fake tx hash-like
      const tx = { h, data };

      (node as any)._devTxs = (node as any)._devTxs || [];
      (node as any)._devTxs.push(tx);

      res.json({ ok: true, queued: tx, queuedCount: (node as any)._devTxs.length });
    } catch (e: any) {
      res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });
}

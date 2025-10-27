import * as fs from "node:fs";
import { buildKidxForJsonl } from "../../util/kidx.js";

type AnyApp = any; // express app
type AnyNode = any; // our Node instance
type AnyMetrics = any;

async function ensureKidxExists(jsonlPath: string, metrics: AnyMetrics): Promise<boolean> {
  const kidxPath = jsonlPath.replace(/\.jsonl$/, ".kidx");
  try {
    if (!fs.existsSync(kidxPath)) {
      metrics.inc?.("kidx_missing_rebuilds", 1);
      await buildKidxForJsonl(jsonlPath);
      console.log("[kidx] warm-built", jsonlPath);
      return true;
    }
  } catch {}
  return false;
}

export function registerIndexExtras(app: AnyApp, node: AnyNode, metrics: AnyMetrics) {
  // Background warmer: keep the newest shard's KIDX present
  setInterval(async () => {
    try {
      const shards = node.txIndex.listShards().sort((a: any, b: any) => b.from - a.from);
      if (!shards.length) return;
      await ensureKidxExists(shards[0].path, metrics);
    } catch {}
  }, 15000).unref?.();

  // Rebuild all KIDX files (optionally force)
  app.post("/index/kidx/rebuild-all", async (req: any, res: any) => {
    try {
      const force = String(req.query.force || "0") === "1";
      const shards = node.txIndex.listShards();
      let rebuilt = 0, skipped = 0;
      for (const s of shards) {
        const kidx = s.path.replace(/\.jsonl$/, ".kidx");
        if (!force && fs.existsSync(kidx)) { skipped++; continue; }
        try { await buildKidxForJsonl(s.path); rebuilt++; } catch {}
      }
      res.json({ ok: true, rebuilt, skipped, total: shards.length });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Quick substring search across recent shards (debug QoL)
  app.get("/tx/search", (req: any, res: any) => {
    const needle = String(req.query.substr || "").toLowerCase().replace(/[^0-9a-f]/g, "");
    const limit = Math.max(1, Math.min(20, Number(req.query.limitShards || 3)));
    if (!needle || needle.length < 6) return res.json({ ok: false, error: "provide ?substr= at least 6 hex chars" });

    try {
      const shards = node.txIndex.listShards().sort((a: any, b: any) => b.from - a.from).slice(0, limit);
      const hits: any[] = [];
      for (const s of shards) {
        try {
          const text = fs.readFileSync(s.path, "utf8");
          if (!text) continue;
          const lines = text.trim().split(/\n+/);
          for (const line of lines) {
            try {
              const j = JSON.parse(line);
              const h = String(j?.h || "");
              if (h.includes(needle)) hits.push(j);
            } catch {}
          }
        } catch {}
      }
      res.json({ ok: true, needle, limitShards: limit, hits });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
}

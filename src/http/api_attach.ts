import { IncomingMessage, ServerResponse } from "node:http"
import url from "node:url"
import fs from "node:fs"
import path from "node:path"
import { SegStore } from "../chain/seg_store.ts"

export function attachApi(server: any, store: SegStore, dataDir: string) {
  if (!server || typeof server.on !== "function") return

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const u = url.parse(req.url || "", true)
      const pathname = u.pathname || "/"

      // -------- /api/health
      if (req.method === "GET" && pathname === "/api/health") {
        const out = { ok: true, dataDir, head: store.loadHeadNumber() }
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify(out))
        return
      }

      // -------- /head
      if (req.method === "GET" && pathname === "/head") {
        const head = store.loadHeadNumber()
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify({ ok: true, head }))
        return
      }

      // -------- /blocks/range?from=&to=
      if (req.method === "GET" && pathname === "/blocks/range") {
        const q = u.query || {}
        const from = Number(q.from ?? 0)
        const to = Number(q.to ?? store.loadHeadNumber())
        if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
          res.writeHead(400, { "content-type": "application/json" })
          res.end(JSON.stringify({ ok: false, error: "bad range" }))
          return
        }
        const arr: any[] = []
        for (let i = from; i <= to; i++) {
          const b = store.loadBlock(i)
          if (b) arr.push(b)
        }
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify(arr))
        return
      }

      // -------- /metrics (quick text format)
      if (req.method === "GET" && pathname === "/metrics") {
        let blocks = 0
        let bytes = 0
        try {
          const segDir = path.join(dataDir, "segments")
          const segs = fs.existsSync(segDir)
            ? fs.readdirSync(segDir).filter(d => /^\d{8}$/.test(d)).sort()
            : []
          for (const s of segs) {
            const metaP = path.join(segDir, s, "meta.json")
            if (fs.existsSync(metaP)) {
              const m = JSON.parse(fs.readFileSync(metaP, "utf8"))
              blocks += (m.to ?? -1) - (m.from ?? 0) + 1
              bytes += m.bytes ?? 0
            }
          }
        } catch {}
        const text = [
          "# HELP void_helper_head Current head number (helper store)",
          "# TYPE void_helper_head gauge",
          `void_helper_head ${store.loadHeadNumber()}`,
          "# HELP void_helper_blocks Total blocks across segments",
          "# TYPE void_helper_blocks gauge",
          `void_helper_blocks ${blocks}`,
          "# HELP void_helper_bytes Total segment bytes",
          "# TYPE void_helper_bytes gauge",
          `void_helper_bytes ${bytes}`,
        ].join("\n") + "\n"
        res.writeHead(200, { "content-type": "text/plain; version=0.0.4; charset=utf-8" })
        res.end(text)
        return
      }

      // 404
      res.writeHead(404, { "content-type": "application/json" })
      res.end(JSON.stringify({ ok: false, error: "not found" }))
    } catch (e: any) {
      try { res.writeHead(500, { "content-type": "application/json" }) } catch {}
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }))
    }
  })
}

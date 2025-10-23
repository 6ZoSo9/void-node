import { IncomingMessage, ServerResponse } from "node:http"
import { SegStore } from "../chain/seg_store.ts"

export function attachApi(server: any, store: SegStore, dataDir: string) {
  if (!server || typeof server.on !== "function") return

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const u = new URL(req.url || "/", "http://x")
      const pathname = u.pathname

      // --- /api/health ---
      if (req.method === "GET" && pathname === "/api/health") {
        const out = { ok: true, dataDir, head: store.loadHeadNumber() }
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify(out))
        return
      }

      // --- /blocks/range?from=&to= ---
      if (req.method === "GET" && pathname === "/blocks/range") {
        const from = Number(u.searchParams.get("from") ?? 0)
        const to   = Number(u.searchParams.get("to") ?? store.loadHeadNumber())
        if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
          res.writeHead(400, { "content-type": "application/json" })
          res.end(JSON.stringify({ ok:false, error:"bad range" }))
          return
        }

        const out:any[] = []
        for (let n = from; n <= to; n++) {
          const b = store.loadBlock(n)
          if (b) out.push(b)
        }
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify(out))
        return
      }

      // default 404 (single writer)
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      res.end("Not Found")
    } catch (e:any) {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" })
      }
      res.end(JSON.stringify({ ok:false, error:String(e?.message || e) }))
    }
  })
}

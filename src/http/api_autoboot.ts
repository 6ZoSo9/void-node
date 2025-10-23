import http, { IncomingMessage, ServerResponse } from "node:http"
import url from "node:url"
import { SegStore } from "../chain/seg_store.ts"

const DATA_DIR   = process.env.DATA_DIR || "data_a"
const HELPER_PORT = Number(process.env.HELPER_PORT || 4315)

// simple API
function writeJson(res: ServerResponse, status: number, payload: any) {
  try { res.writeHead(status, { "content-type": "application/json" }); } catch {}
  res.end(JSON.stringify(payload))
}

const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const u = url.parse(req.url || "", true)
    const p = u.pathname || "/"

    if (req.method === "GET" && p === "/api/health") {
      return writeJson(res, 200, { ok:true, dataDir: DATA_DIR, head: store.loadHeadNumber() })
    }

    if (req.method === "GET" && p === "/head") {
      return writeJson(res, 200, { ok:true, head: store.loadHeadNumber() })
    }

    if (req.method === "GET" && p === "/blocks/range") {
      const from = Number(u.query.from ?? 0)
      const to   = Number(u.query.to   ?? store.loadHeadNumber())
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
        return writeJson(res, 400, { ok:false, error:"bad range" })
      }
      const out:any[] = []
      for (let i = from; i <= to; i++) {
        const b = store.loadBlock(i)
        if (b) out.push(b)
      }
      return writeJson(res, 200, out)
    }

    writeJson(res, 404, { ok:false, error:"not found" })
  } catch (e:any) {
    writeJson(res, 500, { ok:false, error:String(e?.message||e) })
  }
})

server.on("error", (e:any) => {
  console.error("[helper] server error:", e?.code || e)
  process.exit(1)
})

server.listen(HELPER_PORT, "127.0.0.1", () => {
  console.log(`[helper] listening on http://127.0.0.1:${HELPER_PORT} (DATA_DIR=${DATA_DIR})`)
})

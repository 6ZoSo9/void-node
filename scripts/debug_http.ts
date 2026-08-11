import http from "node:http"
import url from "node:url"
import { SegStore } from "../src/chain/seg_store.js"

const HTTP_PORT = Number(process.env.HTTP_PORT || 4300)
const DATA_DIR  = process.env.DATA_DIR || "data"
const MAX_BLOCK_RANGE = 999
const store = new SegStore(DATA_DIR, { segmentMaxBytes: 1024*1024, sparseEvery: 5 })

function json(res: http.ServerResponse, code: number, obj: any) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { "content-type": "application/json", "content-length": Buffer.byteLength(body) })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return json(res, 400, { ok:false, err:"no url" })
  const u = url.parse(req.url, true)

  // Health
  if (u.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      dataDir: DATA_DIR,
      head: store.loadHeadNumber()
    })
  }

  // Debug (minimal)
  if (u.pathname === "/api/debug") {
    return json(res, 200, {
      ok: true,
      head: store.loadHeadNumber(),
      segments: "00000000..", // lightweight stub
    })
  }

  // Blocks range
  if (u.pathname === "/blocks/range") {
    const from = Number(u.query.from ?? -1)
    const to   = Number(u.query.to   ?? -2)
    if (
      !Number.isSafeInteger(from)
      || !Number.isSafeInteger(to)
      || from < 0
      || to < from
      || to - from >= MAX_BLOCK_RANGE
    ) {
      return json(res, 400, { ok:false, err:"invalid range" })
    }

    // stream as a JSON array (simple)
    res.writeHead(200, { "content-type": "application/json" })
    res.write("[")
    let first = true
    for (let n = from; n <= to; n += 1) {
      const b = store.loadBlock(n)
      if (b === null) continue
      if (!first) res.write(",")
      first = false
      res.write(JSON.stringify(b))
    }
    res.write("]")
    return res.end()
  }

  // 404
  res.writeHead(404, { "content-type": "text/plain" })
  res.end("Not found")
})

server.listen(HTTP_PORT, "127.0.0.1", () => {
  console.log(`[debug_http] listening on http://127.0.0.1:${HTTP_PORT} (DATA_DIR=${DATA_DIR})`)
})

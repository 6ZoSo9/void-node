import http from "node:http"
import { SegStore } from "../chain/seg_store.ts"
import { attachApi } from "./api_attach.ts"

const DATA_DIR = process.env.DATA_DIR || "data"          // use your active data dir
const PORT     = Number(process.env.API_HTTP_PORT || 4310)

const server = http.createServer()                          // no default responder
const store  = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
attachApi(server, store, DATA_DIR)

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[api] listening on http://127.0.0.1:${PORT} (DATA_DIR=${DATA_DIR})`)
})

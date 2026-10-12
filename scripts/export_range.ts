import fs from "node:fs"
import { SegStore } from "../src/chain/seg_store.js"

const DATA_DIR = process.env.DATA_DIR || "data_a"
const FROM = Number(process.env.FROM ?? 0)
const TO   = Number(process.env.TO   ?? -1)
const OUT  = process.env.OUT || `export_${FROM}_${TO}.ndjson`

const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
const head = store.loadHeadNumber()
const to = TO >= 0 ? TO : head
if (!Number.isFinite(FROM) || !Number.isFinite(to) || FROM < 0 || to < FROM) {
  console.error(`[export] invalid range from=${FROM} to=${to}`); process.exit(1)
}

const fd = fs.openSync(OUT, "w")
let wrote = 0
;(async () => {
  for (let n = FROM; n <= to; n += 1) {
    const b = store.loadBlock(n)
    if (b === null) continue
    fs.writeSync(fd, JSON.stringify(b) + "\n")
    wrote++
  }
  fs.closeSync(fd)
  console.log(`[export] ${DATA_DIR} ${FROM}..${to} -> ${OUT} (${wrote} blocks)`)
})()

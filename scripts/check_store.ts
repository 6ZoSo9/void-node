import fs from "node:fs"
import path from "node:path"
import { SegStore } from "../src/chain/seg_store"

const DATA_DIR = process.env.DATA_DIR || "data_a"
const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
const segDir = path.join(DATA_DIR, "segments")
const segs = fs.existsSync(segDir) ? fs.readdirSync(segDir).filter(d => /^\d{8}$/.test(d)).sort() : []

let problems = 0
const say = (s:string)=>console.log(s)

say(`[check] data_dir=${DATA_DIR} head=${store.loadHeadNumber()} segments=${segs.join(",")||"(none)"}`)

for (const seg of segs) {
  const dir = path.join(segDir, seg)
  const bin = path.join(dir, "blocks.bin")
  const metaFile = path.join(dir, "meta.json")
  const sparse = path.join(dir, "index.sparse")
  if (!fs.existsSync(bin)) { console.log(`[X] ${seg} missing blocks.bin`); problems++ }
  if (!fs.existsSync(metaFile)) { console.log(`[X] ${seg} missing meta.json`); problems++ }
  if (!fs.existsSync(sparse)) { console.log(`[!] ${seg} missing index.sparse (repairable)`); }
  if (fs.existsSync(metaFile)) {
    try {
      const m = JSON.parse(fs.readFileSync(metaFile,"utf8"))
      if (!(Number.isFinite(m.from) && Number.isFinite(m.to) && m.to >= m.from)) {
        console.log(`[X] ${seg} bad meta range:`, m)
        problems++
      }
    } catch (e) { console.log(`[X] ${seg} corrupt meta.json:`, e); problems++ }
  }
}

// sample random reads across the chain
const head = store.loadHeadNumber()
if (head >= 0) {
  const samples = [0, Math.floor(head/2), head]
  for (const n of samples) {
    const b = store.loadBlock(n)
    if (!b || b.number !== n) { console.log(`[X] random read failed for #${n}`); problems++ }
  }

  // verify full range via streaming
  let count = 0
  for await (const _b of store.findRange(0, head)) count++
  if (count !== head+1) { console.log(`[X] range count mismatch expected=${head+1} got=${count}`); problems++ }
}

console.log(problems ? `[check] FAIL: ${problems} problems` : `[check] OK`)
process.exit(problems ? 1 : 0)

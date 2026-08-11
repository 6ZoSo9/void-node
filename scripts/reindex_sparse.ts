import fs from "node:fs"
import path from "node:path"
import { SegStore } from "../src/chain/seg_store.js"

const DATA_DIR = process.env.DATA_DIR || "data_a"
const EVERY = Number(process.env.SPARSE_EVERY || 16)

function writeU64BE(buf: Buffer, offset: number, value: number) {
  const hi = Math.floor(value / 0x100000000)
  const lo = value >>> 0
  buf.writeUInt32BE(hi, offset)
  buf.writeUInt32BE(lo, offset + 4)
}

const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: EVERY })
const segDir = path.join(DATA_DIR, "segments")
const segs = fs.existsSync(segDir) ? fs.readdirSync(segDir).filter(d => /^\d{8}$/.test(d)).sort() : []

for (const seg of segs) {
  const dir = path.join(segDir, seg)
  const bin = path.join(dir, "blocks.bin")
  const sparse = path.join(dir, "index.sparse")
  if (!fs.existsSync(bin)) continue

  const fd = fs.openSync(bin, "r")
  const stat = fs.fstatSync(fd)
  let pos = 0, count = 0
  const out: Buffer[] = []
  const lenBuf = Buffer.alloc(4)

  while (pos + 4 <= stat.size) {
    fs.readSync(fd, lenBuf, 0, 4, pos)
    const len = lenBuf.readUInt32BE(0)
    if (len < 0 || pos + 4 + len > stat.size) break
    const body = Buffer.alloc(len)
    fs.readSync(fd, body, 0, len, pos + 4)
    const b = JSON.parse(body.toString("utf8"))
    if (b.number % EVERY === 0) {
      const rec = Buffer.alloc(12)
      rec.writeUInt32BE(b.number, 0)
      writeU64BE(rec, 4, pos)
      out.push(rec)
    }
    pos += 4 + len
    count++
  }
  fs.closeSync(fd)

  fs.writeFileSync(sparse, Buffer.concat(out))
  console.log(`[reindex] ${seg}: wrote ${out.length} sparse entries (${count} blocks)`)
}
console.log("[reindex] done.")

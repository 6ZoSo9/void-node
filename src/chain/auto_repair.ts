// src/chain/auto_repair.ts
import * as fs from 'node:fs'
import * as path from 'node:path'

type RepairOpts = {
  sparseEvery?: number   // default 16
  segmentsDir?: string   // default "<dataDir>/segments"
}

/** Big-endian u64 writer used by index.sparse */
function writeU64BE(buf: Buffer, offset: number, value: number) {
  const hi = Math.floor(value / 0x100000000)
  const lo = value >>> 0
  buf.writeUInt32BE(hi, offset)
  buf.writeUInt32BE(lo, offset + 4)
}

/** Scan one segment blocks.bin (len-prefixed) and return offsets + min/max block numbers. */
function scanSegment(binPath: string) {
  const fd = fs.openSync(binPath, "r")
  try {
    const stat = fs.fstatSync(fd)
    const lenBuf = Buffer.alloc(4)
    const offsets: number[] = []
    const nums: number[] = []
    let pos = 0

    while (pos + 4 <= stat.size) {
      fs.readSync(fd, lenBuf, 0, 4, pos)
      const len = lenBuf.readUInt32BE(0)
      if (len <= 0 || pos + 4 + len > stat.size) break

      offsets.push(pos)
      // quick number sniff (optional): try read "number" field if JSON; safe to skip on errors
      try {
        const body = Buffer.alloc(len)
        fs.readSync(fd, body, 0, len, pos + 4)
        const j = JSON.parse(body.toString("utf8"))
        if (typeof j?.number === "number") nums.push(j.number)
      } catch {}
      pos += 4 + len
    }

    const bytes = pos
    const min = nums.length ? Math.min(...nums) : 0
    const max = nums.length ? Math.max(...nums) : (offsets.length ? offsets.length - 1 : -1)

    return { bytes, offsets, min, max, count: offsets.length }
  } finally {
    fs.closeSync(fd)
  }
}

/** Rebuild index.sparse by writing offsets of every Nth block. */
function rebuildSparse(segDir: string, offsets: number[], every: number) {
  const out: number[] = []
  for (let i = 0; i < offsets.length; i += Math.max(1, every)) out.push(offsets[i])
  // Always include the last block offset if we have any
  if (offsets.length && out[out.length - 1] !== offsets[offsets.length - 1]) {
    out.push(offsets[offsets.length - 1])
  }
  const buf = Buffer.alloc(out.length * 8)
  for (let i = 0; i < out.length; i++) writeU64BE(buf, i * 8, out[i])
  fs.writeFileSync(path.join(segDir, "index.sparse"), buf)
  return { written: out.length }
}

/** If meta.json missing or wrong, rewrite it from a scan. */
function repairMeta(segDir: string, bytes: number, min: number, max: number) {
  const metaPath = path.join(segDir, "meta.json")
  const meta = { from: min, to: max, bytes, createdAt: Date.now(), updatedAt: Date.now() }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  return meta
}

/** Main entry: best-effort verification & repair for one data dir. */
export async function autoRepairDataDir(dataDir: string, opts: RepairOpts = {}) {
  const segmentsDir = opts.segmentsDir || path.join(dataDir, "segments")
  const every = Math.max(1, opts.sparseEvery ?? 16)
  if (!fs.existsSync(segmentsDir)) return { ok: true, segments: 0 }

  const segs = fs.readdirSync(segmentsDir).filter(d => /^\d{8}$/.test(d)).sort()
  const reports: any[] = []

  for (const seg of segs) {
    const dir = path.join(segmentsDir, seg)
    const bin = path.join(dir, "blocks.bin")
    if (!fs.existsSync(bin)) continue

    const { bytes, offsets, min, max, count } = scanSegment(bin)
    let metaRepaired = false
    let sparseRebuilt = false
    let meta: any = null

    // meta.json sanity
    const metaPath = path.join(dir, "meta.json")
    try {
      const m = JSON.parse(fs.readFileSync(metaPath, "utf8"))
      const looksOff = !(Number.isFinite(m?.bytes) && m.bytes <= bytes && Number.isFinite(m?.to))
      if (looksOff) { meta = repairMeta(dir, bytes, min, max); metaRepaired = true }
      else meta = m
    } catch {
      meta = repairMeta(dir, bytes, min, max); metaRepaired = true
    }

    // index.sparse presence
    const idxPath = path.join(dir, "index.sparse")
    try {
      const st = fs.statSync(idxPath)
      if (!st.size) throw new Error("empty sparse")
    } catch {
      rebuildSparse(dir, offsets, every)
      sparseRebuilt = true
    }

    reports.push({ seg, count, bytes, min, max, metaRepaired, sparseRebuilt })
  }

  return { ok: true, segments: reports.length, reports }
}

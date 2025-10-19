import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const ENTRY_BYTES = 32 + 4 + 4 // hash(32) + block(uint32) + offset(uint32)

function hexToBytes (hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/i, ''), 'hex')
}
function readU32BE (buf: Buffer, off: number): number {
  return buf.readUInt32BE(off)
}
function writeU32BE (buf: Buffer, off: number, v: number) {
  buf.writeUInt32BE(v, off)
}

export async function buildKidxForJsonl (jsonlPath: string) {
  const kidxPath = jsonlPath.replace(/\.jsonl$/, '.kidx')
  const tmpPath  = kidxPath + '.tmp'

  const rl = readline.createInterface({
    input: fs.createReadStream(jsonlPath),
    crlfDelay: Infinity
  })
  const out = fs.openSync(tmpPath, 'w')
  let count = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    const rec = JSON.parse(line) as { h?: string, n?: number, o?: number }
    const h = String(rec.h || '').toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(h)) continue

    const buf = Buffer.alloc(ENTRY_BYTES)
    hexToBytes(h).copy(buf, 0)
    writeU32BE(buf, 32, (rec.n ?? 0) >>> 0)
    writeU32BE(buf, 36, (rec.o ?? 0) >>> 0)
    fs.writeSync(out, buf)
    count++
  }
  fs.closeSync(out)
  fs.renameSync(tmpPath, kidxPath)
  return { kidxPath, count }
}

export function queryKidx (kidxPath: string, hashHex: string): { found: boolean, n?: number, o?: number } {
  if (!fs.existsSync(kidxPath)) return { found: false }

  const fd = fs.openSync(kidxPath, 'r')
  try {
    const target = hexToBytes(hashHex.toLowerCase())
    const stat = fs.fstatSync(fd)
    const entries = Math.floor(stat.size / ENTRY_BYTES)
    const buf = Buffer.alloc(ENTRY_BYTES)

    // NOTE: linear scan (kidx isn’t sorted yet). It’s still tiny/fast.
    // Later we can sort + switch to binary search.
    for (let i = 0; i < entries; i++) {
      fs.readSync(fd, buf, 0, ENTRY_BYTES, i * ENTRY_BYTES)
      if (buf.subarray(0, 32).equals(target)) {
        const n = readU32BE(buf, 32)
        const o = readU32BE(buf, 36)
        return { found: true, n, o }
      }
    }
    return { found: false }
  } finally {
    fs.closeSync(fd)
  }
}

export async function buildAllKidx (indexDir = path.join('data', 'index')) {
  if (!fs.existsSync(indexDir)) return { ok: true, built: 0 }
  const files = fs.readdirSync(indexDir).filter(f => f.endsWith('.jsonl'))
  let built = 0
  for (const f of files) {
    const jsonl = path.join(indexDir, f)
    const kidx  = jsonl.replace(/\.jsonl$/, '.kidx')
    const jStat = fs.statSync(jsonl)
    const kStat = fs.existsSync(kidx) ? fs.statSync(kidx) : null
    if (!kStat || kStat.mtimeMs < jStat.mtimeMs) {
      await buildKidxForJsonl(jsonl)
      built++
    }
  }
  return { ok: true, built }
}


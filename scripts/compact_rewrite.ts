import fs from "node:fs"
import path from "node:path"
import { SegStore } from "../src/chain/seg_store.js"

function recordScriptsEmptyHandlerVisibilityFailure_scripts_compact_rewrite_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/compact_rewrite.ts",
    scope,
    message,
  });
}


const DATA_DIR = process.env.DATA_DIR || "data_a"
const TMP_DIR  = `${DATA_DIR}_rewrite_tmp`

// read all blocks by scanning the raw file (not using SegStore) to recover as much as possible
function scanAll(dir: string): any[] {
  const bin = path.join(dir, "segments", "00000000", "blocks.bin")
  if (!fs.existsSync(bin)) return []
  const fd = fs.openSync(bin, "r")
  const stat = fs.fstatSync(fd)
  let pos = 0
  const lenBuf = Buffer.alloc(4)
  const out:any[] = []
  while (pos + 4 <= stat.size) {
    fs.readSync(fd, lenBuf, 0, 4, pos)
    const len = lenBuf.readUInt32BE(0)
    if (len < 0 || pos + 4 + len > stat.size) break
    const body = Buffer.alloc(len)
    fs.readSync(fd, body, 0, len, pos + 4)
    try { out.push(JSON.parse(body.toString("utf8"))) } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_compact_rewrite_ts("empty-handler-1", err); }
    pos += 4 + len
  }
  fs.closeSync(fd)
  return out
}

function uniqueIncreasing(blocks: any[]): any[] {
  const map = new Map<number, any>()
  for (const b of blocks) {
    if (typeof b?.number === "number") {
      // keep the FIRST seen version of each height (or choose latest; pick one policy)
      if (!map.has(b.number)) map.set(b.number, b)
    }
  }
  return Array.from(map.keys()).sort((a,b)=>a-b).map(k => map.get(k))
}

function main() {
  const srcDir = DATA_DIR
  const tmp = TMP_DIR
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(path.join(tmp, "segments", "00000000"), { recursive: true })

  const all = scanAll(srcDir)
  const uniq = uniqueIncreasing(all)
  if (uniq.length === 0) { console.error("[compact] no blocks found"); process.exit(1) }

  // write into tmp via a fresh SegStore (forces new meta/sparse)
  const store = new SegStore(tmp, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
  for (const b of uniq) store.saveBlock(b)

  // atomically swap: move old to backup, tmp to live
  const bak = `${DATA_DIR}.bak_${Date.now()}`
  fs.renameSync(srcDir, bak)
  fs.renameSync(tmp, srcDir)
  console.log(`[compact] wrote ${uniq.length} unique blocks. backup saved at ${bak}`)
}

main()

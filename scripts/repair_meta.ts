import fs from "node:fs"
import path from "node:path"

function recordScriptsEmptyHandlerVisibilityFailure_scripts_repair_meta_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/repair_meta.ts",
    scope,
    message,
  });
}


const DATA_DIR = process.env.DATA_DIR || "data_a"
const seg = process.env.SEG || "00000000"
const dir = path.join(DATA_DIR, "segments", seg)
const bin = path.join(dir, "blocks.bin")
const metaFile = path.join(dir, "meta.json")

if (!fs.existsSync(bin)) { console.error("[repair_meta] no blocks.bin"); process.exit(1) }

const fd = fs.openSync(bin, "r")
const stat = fs.fstatSync(fd)
let pos = 0
let minNum = Infinity, maxNum = -1
const lenBuf = Buffer.alloc(4)

while (pos + 4 <= stat.size) {
  fs.readSync(fd, lenBuf, 0, 4, pos)
  const len = lenBuf.readUInt32BE(0)
  if (len < 0 || pos + 4 + len > stat.size) break
  const body = Buffer.alloc(len)
  fs.readSync(fd, body, 0, len, pos + 4)
  try {
    const b = JSON.parse(body.toString("utf8"))
    if (typeof b.number === "number") {
      if (b.number < minNum) minNum = b.number
      if (b.number > maxNum) maxNum = b.number
    }
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_repair_meta_ts("empty-handler-1", err); }
  pos += 4 + len
}
fs.closeSync(fd)

if (!isFinite(minNum) || maxNum < 0) {
  console.error("[repair_meta] no blocks parsed; aborting.")
  process.exit(1)
}

const now = Date.now()
const meta = { from: minNum, to: maxNum, bytes: stat.size, createdAt: now, updatedAt: now }
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
console.log("[repair_meta] wrote meta:", meta)

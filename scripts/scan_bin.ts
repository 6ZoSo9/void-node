import fs from "node:fs"
import path from "node:path"

function recordScriptsEmptyHandlerVisibilityFailure_scripts_scan_bin_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/scan_bin.ts",
    scope,
    message,
  });
}


const DATA_DIR = process.env.DATA_DIR || "data_a"
const seg = "00000000"
const dir = path.join(DATA_DIR, "segments", seg)
const bin = path.join(dir, "blocks.bin")
const metaFile = path.join(dir, "meta.json")

if (!fs.existsSync(bin)) { console.error("[scan] no blocks.bin"); process.exit(1) }
const fd = fs.openSync(bin, "r")
const stat = fs.fstatSync(fd)
let pos = 0, count = 0
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
      count++
    }
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_scan_bin_ts("empty-handler-1", err); }
  pos += 4 + len
}
fs.closeSync(fd)

const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile,"utf8")) : null
console.log(JSON.stringify({
  dataDir: DATA_DIR,
  segment: seg,
  fileBytes: stat.size,
  blocksParsed: count,
  minNumber: isFinite(minNum) ? minNum : null,
  maxNumber: maxNum,
  meta
}, null, 2))

import fs from "node:fs"
import path from "node:path"

function recordScriptsEmptyHandlerVisibilityFailure_scripts_audit_numbers_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/audit_numbers.ts",
    scope,
    message,
  });
}


const DATA_DIR = process.env.DATA_DIR || "data_a"
const seg = process.env.SEG || "00000000"
const dir = path.join(DATA_DIR, "segments", seg)
const bin = path.join(dir, "blocks.bin")

if (!fs.existsSync(bin)) { console.error("[audit] no blocks.bin"); process.exit(1) }

const fd = fs.openSync(bin, "r")
const stat = fs.fstatSync(fd)
let pos = 0

const lenBuf = Buffer.alloc(4)
const nums: number[] = []
while (pos + 4 <= stat.size) {
  fs.readSync(fd, lenBuf, 0, 4, pos)
  const len = lenBuf.readUInt32BE(0)
  if (len < 0 || pos + 4 + len > stat.size) break
  const body = Buffer.alloc(len)
  fs.readSync(fd, body, 0, len, pos + 4)
  try {
    const b = JSON.parse(body.toString("utf8"))
    if (typeof b?.number === "number") nums.push(b.number)
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_audit_numbers_ts("empty-handler-1", err); }
  pos += 4 + len
}
fs.closeSync(fd)

nums.sort((a,b)=>a-b)
const uniq: number[] = []
const dupes: number[] = []
for (let i=0;i<nums.length;i++){
  if (i===0 || nums[i]!==nums[i-1]) uniq.push(nums[i]);
  else dupes.push(nums[i]);
}
const min = uniq.length? uniq[0]: null
const max = uniq.length? uniq[uniq.length-1]: null

const missing:number[] = []
if (min!==null && max!==null) {
  let p = min
  for (const n of uniq) {
    while (p<n) { missing.push(p); p++ }
    p = n+1
  }
}

console.log(JSON.stringify({
  dataDir: DATA_DIR,
  segment: seg,
  blocksParsed: nums.length,
  uniqueHeights: uniq.length,
  min, max,
  duplicatesSample: dupes.slice(0,20),
  missingCount: missing.length,
  missingSample: missing.slice(0,50)
}, null, 2))

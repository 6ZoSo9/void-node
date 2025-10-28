import fs from "node:fs"
import readline from "node:readline"
import { SegStore } from "../src/chain/seg_store"

const DATA_DIR = process.env.DATA_DIR || "data_b"
const IN = process.env.IN
if (!IN || !fs.existsSync(IN)) { console.error("[import] set IN=<file.ndjson>"); process.exit(1) }

const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })
const currentHead = store.loadHeadNumber()
let imported = 0

const rl = readline.createInterface({ input: fs.createReadStream(IN), crlfDelay: Infinity })
rl.on("line", (line) => {
  if (!line.trim()) return
  try {
    const b = JSON.parse(line)
    // only append if beyond our head
    if (typeof b.number === "number" && b.number > currentHead) {
      store.saveBlock(b)
      imported++
    }
  } catch (_) {}
})
rl.once("close", () => {
  console.log(`[import] done: ${imported} blocks -> ${DATA_DIR}, head=${store.loadHeadNumber()}`)
})

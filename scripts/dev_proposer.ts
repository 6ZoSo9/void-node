import { SegStore } from "../src/chain/seg_store.js"

const DATA_DIR = process.env.DATA_DIR || "data"
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 500)

type Block = { number: number; parentHash: string; hash: string; ts: number; [k:string]: any }

const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })

let n = store.loadHeadNumber() + 1
let parent = n > 0 ? `0x${n-1}` : "0x00"

console.log(`[dev_proposer] starting at head+1=${n} (DATA_DIR=${DATA_DIR}) interval=${INTERVAL_MS}ms`)

setInterval(() => {
  const b: Block = {
    number: n,
    parentHash: parent,
    hash: `0x${n}`,
    ts: Date.now(),
    payload: { note: "dev proposer" },
  }
  store.saveBlock(b as any)
  process.stdout.write(`appended #${n}\r`)
  parent = `0x${n}`
  n++
}, INTERVAL_MS)

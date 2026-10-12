import { SegStore } from "../src/chain/seg_store.js"

// runtime-only shape; we don't need the Block type here
type Block = { number: number; [k: string]: any }

const store = new SegStore(process.env.DATA_DIR || "data", {
  segmentMaxBytes: 1024 * 1024,
  sparseEvery: 5,
})

// append 25 simple blocks
for (let i = 0; i < 25; i++) {
  const b: Block = {
    number: i,
    parentHash: i === 0 ? "0x00" : `0x${i - 1}`,
    hash: `0x${i}`,
    ts: Date.now(),
    data: `smoke-${i}`,
  }
  store.saveBlock(b as any)
}

console.log("head =", store.loadHeadNumber())

import { SegStore } from "../src/chain/seg_store"

type Block = { number: number; [k:string]: any }

const DATA_DIR = process.env.DATA_DIR || "rollover_test"

// start clean
import fs from "node:fs"
import path from "node:path"
fs.rmSync(DATA_DIR, { recursive: true, force: true })

const opts = { segmentMaxBytes: 24 * 1024, sparseEvery: 10 } // tiny to force rollover
const store = new SegStore(DATA_DIR, opts)

// write blocks until at least two segments exist
let i = 0
while (true) {
  const b: Block = { number: i, data: "x".repeat(200), ts: Date.now(), hash: `0x${i}`, parentHash: i?`0x${i-1}`:"0x00" }
  store.saveBlock(b as any)
  i++
  // detect new segment by listing dirs
  const segs = fs.readdirSync(path.join(DATA_DIR, "segments")).filter(d => /^\d{8}$/.test(d)).sort()
  if (segs.length >= 2) {
    console.log("[rollover] created second segment:", segs.join(", "))
    break
  }
}

const head = store.loadHeadNumber()
console.log("[rollover] head:", head)

// verify reads across boundary
const mid = Math.floor(head / 2)
const samples = [0, mid, head]
for (const n of samples) {
  const b = store.loadBlock(n)
  if (!b || b.number !== n) throw new Error("failed to read block " + n)
}
console.log("[rollover] random reads ok:", samples.join(", "))

// verify range stream
let count = 0
for await (const b of store.findRange(0, head)) count++
if (count !== head + 1) throw new Error(`range expected ${head+1} got ${count}`)
console.log("[rollover] range 0..head ok, count=", count)

// simulate restart and re-verify
const store2 = new SegStore(DATA_DIR, opts)
if (store2.loadHeadNumber() !== head) throw new Error("head mismatch after restart")
const b0 = store2.loadBlock(0), bh = store2.loadBlock(head)
if (!b0 || !bh) throw new Error("post-restart read failed")
console.log("[rollover] restart read ok")

console.log("[OK] rollover test passed.")

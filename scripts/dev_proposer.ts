import * as fs from "node:fs";
import * as path from "node:path";
import { SegStore } from "../src/chain/seg_store.js";
import { blockHash } from "../src/chain/block.js";

const DATA_DIR = process.env.DATA_DIR || "data";
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 500);
const MEMPOOL = path.join(DATA_DIR, "mempool.jsonl");

type Tx = { data: string; ts?: number };

function readJSONL(file: string): Tx[] {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const out: Tx[] = [];
  for (const ln of lines) { try { const o = JSON.parse(ln); if (o && typeof o.data === "string") out.push(o); } catch {} }
  return out;
}

function truncateFile(file: string) {
  try { fs.writeFileSync(file, ""); } catch {}
}

async function main() {
  const store = new SegStore(DATA_DIR);
  console.log(`[dev_proposer] DATA_DIR=${DATA_DIR} interval=${INTERVAL_MS}ms emptyBlocks=DISALLOWED`);

  while (true) {
    try {
      // Load head
      const headInfo = await store.getHead?.() ?? null; // if SegStore has helper
      let headNum = -1, parentHash: string | null = null;
      if (headInfo && typeof headInfo.head === "number") {
        headNum = headInfo.head;
        parentHash = headInfo.hash || null;
      } else {
        // fallback to heads.json
        const hj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "heads.json"), "utf8"));
        headNum = Number(hj?.head ?? -1);
        parentHash = hj?.hash ?? null;
      }

      const pending = readJSONL(MEMPOOL);
      if (!pending.length) {
        // no tx -> do nothing (empty blocks not allowed)
        await new Promise(r => setTimeout(r, INTERVAL_MS));
        continue;
      }

      const nextNum = headNum + 1;
      const block = {
        number: nextNum,
        parentHash: parentHash,
        timestamp: Date.now(),
        txs: pending,
      } as any;

      // compute hash if util exists
      try { (block as any).hash = blockHash(block); } catch {}

      await store.appendBlock?.(block) ?? (store as any).append?.(block);
      console.log(`[dev_proposer] sealed #${nextNum} txs=${pending.length}`);

      // clear mempool only after successful append
      truncateFile(MEMPOOL);
    } catch (e:any) {
      console.error("[dev_proposer] error:", e?.message || e);
    }
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }
}
main().catch(e => { console.error(e); process.exit(1); });

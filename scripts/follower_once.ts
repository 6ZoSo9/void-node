import { SegStore } from "../src/chain/seg_store"

function recordScriptsEmptyHandlerVisibilityFailure_scripts_follower_once_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/follower_once.ts",
    scope,
    message,
  });
}


const SRC      = process.env.SRC || "http://127.0.0.1:4300"
const DATA_DIR = process.env.DATA_DIR || "data_b"
const CHUNK    = Number(process.env.CHUNK || 200)
const RETRIES  = Number(process.env.RETRIES || 5)
const BACKOFF  = Number(process.env.BACKOFF || 300) // ms

type Block = { number: number; [k:string]: any }

async function getJSON<T>(url: string, tries = RETRIES): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res.json() as any
      throw new Error(`${res.status} ${res.statusText}`)
    } catch (e) {
      if (i === tries - 1) throw e
      await new Promise(r => setTimeout(r, BACKOFF * (i + 1)))
    }
  }
  throw new Error("unreachable")
}

async function getSourceHead(src: string): Promise<number> {
  // 1) Preferred live shape
  try {
    const demo = await getJSON<any>(`${src}/__void/demo/summary.json`)
    const head = demo?.chain?.head
    if (Number.isFinite(head)) return Number(head)
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_follower_once_ts("empty-handler-1", err); }

  // 2) Fallback legacy helper
  try {
    const h = await getJSON<any>(`${src}/api/health`)
    const head = h?.head
    if (Number.isFinite(head)) return Number(head)
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_follower_once_ts("empty-handler-2", err); }

  // 3) Fallback current /health if a future build adds head there
  try {
    const h = await getJSON<any>(`${src}/health`)
    const head = h?.head
    if (Number.isFinite(head)) return Number(head)
  } catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_follower_once_ts("empty-handler-3", err); }

  throw new Error(`could not resolve source head from ${src}`)
}

async function main() {
  const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 })

  const myHead = store.loadHeadNumber()
  const theirHead = await getSourceHead(SRC)
  const start = Math.max(0, myHead + 1)

  if (theirHead < start) {
    console.log(`[follower_once] up to date (mine=${myHead}, theirs=${theirHead})`)
    return
  }

  console.log(`[follower_once] syncing ${start}..${theirHead} from ${SRC} -> ${DATA_DIR} (chunk=${CHUNK})`)

  for (let from = start; from <= theirHead; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, theirHead)
    const blocks = await getJSON<Block[]>(`${SRC}/blocks/range?from=${from}&to=${to}`)
    for (const b of blocks) store.saveBlock(b as any)
    process.stdout.write(` imported ${from}..${to}\r`)
  }

  console.log(`\n[follower_once] done. head=${store.loadHeadNumber()}`)
}

main().catch(e => {
  console.error("[follower_once] error:", e)
  process.exit(1)
})

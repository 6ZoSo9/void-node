import { SegStore } from "../src/chain/seg_store"

// -------- tiny argv parser (no deps) --------
type Args = Record<string, string | number | boolean>;
function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { out[k] = /^\d+$/.test(next) ? Number(next) : next; i++; }
    else { out[k] = true; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

// -------- config (env ← flags override) --------
const SRC      = String(args.peer || process.env.SRC || process.env.HELPER_BASE || "http://127.0.0.1:4300");
const DATA_DIR = String(args.dataDir || process.env.DATA_DIR || "data_b");
const CHUNK    = Number(args.chunk || process.env.CHUNK || 200);
const RETRIES  = Number(args.retries || process.env.RETRIES || 5);
const BACKOFF  = Number(args.backoff || process.env.BACKOFF || 300); // ms

const FORCED_FROM  = args.from  != null ? Number(args.from)  : undefined;
const FORCED_TO    = args.to    != null ? Number(args.to)    : undefined;
const FORCED_COUNT = args.count != null ? Number(args.count) : undefined;

type Block = { number: number; [k: string]: any };

async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

async function getJSON<T>(url: string, tries = RETRIES): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json() as any;
      throw new Error(`${res.status} ${res.statusText}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(BACKOFF * (i + 1));
    }
  }
  throw new Error("unreachable");
}

async function getHeadFromHealth(base:string): Promise<number> {
  // prefer /api/health if present; fallback to /blocks/latest/number2.json
  try {
    const h = await getJSON<{ok:boolean; head:number}>(`${base}/api/health`, 2);
    if (h && h.ok && typeof h.head === "number") return h.head;
  } catch {}
  const n2 = await getJSON<{number:number}>(`${base}/blocks/latest/number2.json`, 2);
  if (n2 && typeof n2.number === "number") return n2.number;
  throw new Error("no head available from health or latest-number2.json");
}

async function main() {
  const store = new SegStore(DATA_DIR, { segmentMaxBytes: 8*1024*1024, sparseEvery: 16 });
  const myHead = store.loadHeadNumber();

  let theirHead: number;
  if (FORCED_TO != null || FORCED_COUNT != null) {
    // we can skip health entirely
    if (FORCED_TO != null) theirHead = FORCED_TO;
    else                    theirHead = myHead + Number(FORCED_COUNT);
  } else {
    theirHead = await getHeadFromHealth(SRC);
  }

  const start = FORCED_FROM != null ? FORCED_FROM : (myHead + 1);
  if (theirHead < start) {
    console.log(`[follower_once] up to date (mine=${myHead}, theirs=${theirHead})`);
    return;
  }

  console.log(`[follower_once] syncing ${start}..${theirHead} from ${SRC} -> ${DATA_DIR} (chunk=${CHUNK})`);
  for (let from = start; from <= theirHead; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, theirHead);
    const url = `${SRC}/blocks/range?from=${from}&to=${to}`;
    const blocks = await getJSON<Block[]>(url);
    for (const b of blocks) store.saveBlock(b as any);
    process.stdout.write(` imported ${from}..${to}\r`);
  }
  console.log(`\n[follower_once] done. head=${store.loadHeadNumber()}`);
}

main().catch(e => { console.error("[follower_once] error:", e); process.exitCode = 1; });

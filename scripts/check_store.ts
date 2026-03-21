#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "node:fs";
import * as path from "node:path";

function isObj(x: any) { return x && typeof x === "object"; }
function asNum(x: any): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "string" && x.trim() && !Number.isNaN(Number(x))) return Number(x);
  if (isObj(x) && typeof x.number === "number") return x.number;
  if (isObj(x) && typeof x.head === "number") return x.head;
  return null;
}

async function tryImportSegStore(): Promise<any | null> {
  const candidates = [
    "../src/chain/seg_store.ts",
    "../src/chain/seg_store.js",
    "../src/chain/seg_store.mjs",
  ];
  for (const rel of candidates) {
    try {
      // tsx resolves .ts fine; keep dynamic import for portability
      const mod: any = await import(rel);
      return mod;
    } catch { /* keep trying */ }
  }
  return null;
}

function listSegments(dir: string) {
  try {
    const ents = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() || e.isFile())
      .map(e => e.name)
      .filter(n => /^\d{8}$/.test(n))
      .sort();
    return ents;
  } catch {
    return [];
  }
}

async function getHead(store: any): Promise<number | null> {
  const fns = ["getHead", "head", "getHeadNumber", "getLatestNumber", "readHead", "getTip", "tip"];
  for (const k of fns) {
    const fn = (store as any)?.[k];
    if (typeof fn === "function") {
      try {
        const v = await fn.call(store);
        const n = asNum(v);
        if (n !== null) return n;
      } catch { /* ignore */ }
    }
  }
  const n = asNum((store as any)?.head);
  return n;
}

async function tryCountRange(store: any, head: number): Promise<{count: number | null, used: string | null}> {
  const names = ["findRange", "iterRange", "range", "readRange", "getRange"];
  for (const name of names) {
    const fn = (store as any)?.[name];
    if (typeof fn !== "function") continue;

    let it: any;
    try {
      it = fn.call(store, 0, head);
    } catch {
      continue;
    }

    // async iterable
    if (it && typeof it[Symbol.asyncIterator] === "function") {
      let c = 0;
      for await (const _ of it) c++;
      return { count: c, used: name };
    }

    // sync iterable (rare)
    if (it && typeof it[Symbol.iterator] === "function") {
      let c = 0;
      for (const _ of it) c++;
      return { count: c, used: name };
    }

    // array
    if (Array.isArray(it)) return { count: it.length, used: name };

    // not iterable -> skip
  }
  return { count: null, used: null };
}

async function main() {
  const argDir = process.argv[2];
  const dataDir = process.env.DATA_DIR || argDir || "data_a";

  // best-effort: print segments without dumping the full list (prevents huge output)
  const absDir = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
  const segs = listSegments(absDir);
  const tail = segs.slice(-8).join(",");
  const segsTotal = segs.length;

  const mod = await tryImportSegStore();
  if (!mod) {
    console.log(`[check] data_dir=${dataDir} head=? segments_total=${segsTotal} segments_tail=${tail}`);
    console.log("[warn] could not import SegStore; skipping head/range checks");
    process.exit(0);
  }

  const SegStore = (mod as any).SegStore || (mod as any).default || (mod as any).segStore || null;
  if (!SegStore) {
    console.log(`[check] data_dir=${dataDir} head=? segments_total=${segsTotal} segments_tail=${tail}`);
    console.log("[warn] SegStore export not found; skipping head/range checks");
    process.exit(0);
  }

  let store: any = null;
  try { store = new SegStore(dataDir); }
  catch {
    try { store = new SegStore({ dir: dataDir }); }
    catch { store = null; }
  }

  if (!store) {
    console.log(`[check] data_dir=${dataDir} head=? segments_total=${segsTotal} segments_tail=${tail}`);
    console.log("[warn] could not construct SegStore; skipping head/range checks");
    process.exit(0);
  }

  if (typeof store.open === "function") {
    try { await store.open(); } catch { /* ignore */ }
  }

  const head = await getHead(store);
  const hn = head === null ? "?" : String(head);

  let countStr = "skipped";
  let usedStr = "";
  if (head !== null) {
    const { count, used } = await tryCountRange(store, head);
    if (count !== null) {
      countStr = String(count);
      usedStr = used ? ` range_method=${used}` : "";
    } else {
      countStr = "skipped";
      usedStr = " range_method=none";
    }
  }

  console.log(`[check] data_dir=${dataDir} head=${hn} blocks_count=${countStr}${usedStr} segments_total=${segsTotal} segments_tail=${tail}`);
}

main().catch((e) => {
  console.error("[ERR]", e?.stack || String(e));
  process.exit(2);
});
